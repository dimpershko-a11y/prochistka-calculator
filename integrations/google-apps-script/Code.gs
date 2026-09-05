/**
 * PRO-CHISTKA config publisher.
 * GitHub token and publication secret are stored only in Apps Script Script Properties.
 *
 * Required Script Properties:
 * GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, SYNC_SECRET
 * Optional: GITHUB_PATH (defaults to config.js)
 */

function getSettings_() {
  var props = PropertiesService.getScriptProperties();
  var settings = {
    token: props.getProperty('GITHUB_TOKEN') || '',
    owner: props.getProperty('GITHUB_OWNER') || '',
    repo: props.getProperty('GITHUB_REPO') || '',
    branch: props.getProperty('GITHUB_BRANCH') || 'production',
    pagesBranch: props.getProperty('GITHUB_PAGES_BRANCH') || 'work-v4.10.1',
    secret: props.getProperty('SYNC_SECRET') || '',
    path: props.getProperty('GITHUB_PATH') || 'config.js'
  };
  var missing = [];
  if (!settings.token) missing.push('GITHUB_TOKEN');
  if (!settings.owner) missing.push('GITHUB_OWNER');
  if (!settings.repo) missing.push('GITHUB_REPO');
  if (!settings.secret) missing.push('SYNC_SECRET');
  if (missing.length) throw new Error('Не заданы Script Properties: ' + missing.join(', '));
  return settings;
}

function githubHeaders_(token) {
  return {
    'Accept': 'application/vnd.github+json',
    'Authorization': 'Bearer ' + token,
    'X-GitHub-Api-Version': '2022-11-28'
  };
}

function configApiUrl_(s) {
  return 'https://api.github.com/repos/' +
    encodeURIComponent(s.owner) + '/' +
    encodeURIComponent(s.repo) + '/contents/' +
    s.path.split('/').map(encodeURIComponent).join('/');
}

function parseConfig_(text) {
  var raw = String(text || '').trim();
  var match = raw.match(/^window\.PROCHISTKA_CONFIG\s*=\s*([\s\S]*?);?\s*$/);
  if (!match) throw new Error('Файл не похож на config.js PRO-CHISTKA');
  var config = JSON.parse(match[1]);
  if (!config || typeof config !== 'object' || !config.defaults) throw new Error('В config.js отсутствует defaults');
  if (!Array.isArray(config.defaults.extras)) throw new Error('В config.js отсутствует список extras');
  var revision = Number(config.CONFIG_REVISION || 0);
  if (!Number.isInteger(revision) || revision < 1) throw new Error('Некорректный CONFIG_REVISION');
  return config;
}

function readRemoteConfig_(s, branch) {
  var targetBranch = branch || s.branch;
  var url = configApiUrl_(s) + '?ref=' + encodeURIComponent(targetBranch);
  var response = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: githubHeaders_(s.token),
    muteHttpExceptions: true
  });
  var code = response.getResponseCode();
  if (code !== 200) throw new Error('GitHub GET config.js: HTTP ' + code + ' · ' + response.getContentText().slice(0, 300));
  var data = JSON.parse(response.getContentText());
  var decoded = Utilities.newBlob(Utilities.base64Decode(String(data.content || '').replace(/\s/g, ''))).getDataAsString('UTF-8');
  return {
    sha: String(data.sha || ''),
    text: decoded,
    config: parseConfig_(decoded)
  };
}

function writeRemoteConfig_(s, configText, sha, revision, branch) {
  var payload = {
    message: 'Update calculator config revision ' + revision,
    content: Utilities.base64Encode(configText, Utilities.Charset.UTF_8),
    sha: sha,
    branch: branch || s.branch
  };
  var response = UrlFetchApp.fetch(configApiUrl_(s), {
    method: 'put',
    contentType: 'application/json',
    headers: githubHeaders_(s.token),
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  var code = response.getResponseCode();
  if (code !== 200 && code !== 201) throw new Error('GitHub PUT config.js: HTTP ' + code + ' · ' + response.getContentText().slice(0, 500));
  var data = JSON.parse(response.getContentText());
  return String(data.commit && data.commit.sha || '');
}

function responseHtml_(requestId, payload) {
  var data = Object.assign({
    type: 'prochistka-config-sync',
    requestId: String(requestId || '')
  }, payload || {});
  var json = JSON.stringify(data).replace(/</g, '\\u003c');
  return HtmlService.createHtmlOutput(
    '<!doctype html><meta charset="utf-8"><script>' +
    'window.parent.postMessage(' + json + ', "*");' +
    '</script><body></body>'
  ).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ok: true, service: 'PRO-CHISTKA config sync'}))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var requestId = e && e.parameter ? e.parameter.requestId : '';
  var lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(15000)) throw new Error('Синхронизация уже выполняется. Повторите через несколько секунд.');

    var s = getSettings_();
    var action = String(e.parameter.action || '');
    var secret = String(e.parameter.secret || '');
    if (action !== 'publishConfig') throw new Error('Неизвестная операция');
    if (!secret || secret !== s.secret) throw new Error('Неверный ключ публикации');

    var configText = String(e.parameter.configText || '');
    if (!configText || configText.length > 500000) throw new Error('Некорректный размер config.js');

    var incoming = parseConfig_(configText);
    var requestedRevision = Number(e.parameter.revision || 0);
    if (Number(incoming.CONFIG_REVISION) !== requestedRevision) throw new Error('Ревизия запроса не совпадает с config.js');

    var remote = readRemoteConfig_(s, s.branch);
    var remoteRevision = Number(remote.config.CONFIG_REVISION || 0);
    if (requestedRevision <= remoteRevision) {
      throw new Error('На GitHub уже есть ревизия ' + remoteRevision + '. Обновите калькулятор и повторите публикацию.');
    }

    var commitSha = writeRemoteConfig_(s, configText, remote.sha, requestedRevision, s.branch);
    var pagesCommitSha = '';
    var pagesPreviousRevision = null;

    if (s.pagesBranch && s.pagesBranch !== s.branch) {
      var pagesRemote = readRemoteConfig_(s, s.pagesBranch);
      pagesPreviousRevision = Number(pagesRemote.config.CONFIG_REVISION || 0);
      if (requestedRevision > pagesPreviousRevision) {
        pagesCommitSha = writeRemoteConfig_(s, configText, pagesRemote.sha, requestedRevision, s.pagesBranch);
      }
    }

    return responseHtml_(requestId, {
      ok: true,
      revision: requestedRevision,
      previousRevision: remoteRevision,
      commitSha: commitSha,
      pagesBranch: s.pagesBranch,
      pagesPreviousRevision: pagesPreviousRevision,
      pagesCommitSha: pagesCommitSha
    });
  } catch (err) {
    return responseHtml_(requestId, {
      ok: false,
      error: String(err && err.message || err)
    });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function testGitHubConnection() {
  var s = getSettings_();
  var remote = readRemoteConfig_(s, s.branch);
  Logger.log('GitHub OK. Branch: %s, revision: %s, sha: %s', s.branch, remote.config.CONFIG_REVISION, remote.sha);
  return {
    ok: true,
    branch: s.branch,
    revision: remote.config.CONFIG_REVISION,
    sha: remote.sha
  };
}
