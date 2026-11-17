const t = (key) => chrome.i18n.getMessage(key) || key;
const $ = (id) => document.getElementById(id);

document.documentElement.lang = chrome.i18n.getUILanguage().slice(0, 2);
for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);

function addSiteRow(site) {
  const tr = document.createElement('tr');
  tr.innerHTML = '<td><input type="text" class="folder"></td><td><input type="text" class="hosts"></td><td><button type="button"></button></td>';
  tr.querySelector('.folder').value = site.folder || '';
  tr.querySelector('.hosts').value = (site.hosts || []).join(', ');
  const remove = tr.querySelector('button');
  remove.textContent = t('optRemove');
  remove.onclick = () => { tr.remove(); updateExample(); };
  $('sites').appendChild(tr);
}

function render(s) {
  $('enabled').checked = s.enabled;
  $('root').value = s.root;
  $('otherFolder').value = s.otherFolder;
  $('perModelFolder').checked = s.perModelFolder;
  $('sites').textContent = '';
  s.sites.forEach(addSiteRow);
  $('types').textContent = '';
  for (const ext of Object.keys(MDS.DEFAULT_SETTINGS.types)) {
    const label = document.createElement('label');
    label.className = 'check';
    label.innerHTML = '<input type="checkbox"> <span></span>';
    label.querySelector('input').dataset.ext = ext;
    label.querySelector('input').checked = !!s.types[ext];
    label.querySelector('span').textContent = '.' + ext;
    $('types').appendChild(label);
  }
  updateExample();
}

function collect() {
  const sites = [...$('sites').querySelectorAll('tr')]
    .map((tr) => ({
      folder: tr.querySelector('.folder').value.trim(),
      hosts: tr.querySelector('.hosts').value.split(/[,\s]+/).map((h) => h.trim().toLowerCase()).filter(Boolean),
    }))
    .filter((site) => site.folder && site.hosts.length);
  const types = {};
  for (const box of $('types').querySelectorAll('input')) types[box.dataset.ext] = box.checked;
  return {
    enabled: $('enabled').checked,
    root: $('root').value.trim(),
    otherFolder: $('otherFolder').value.trim() || 'Other',
    perModelFolder: $('perModelFolder').checked,
    types,
    sites,
  };
}

function updateExample() {
  const s = collect();
  const host = (s.sites[0] && s.sites[0].hosts[0]) || 'example.com';
  $('example').textContent = MDS.chooseFolder({
    filename: 'Benchy.3mf',
    referrer: 'https://' + host + '/models/1',
    tabUrl: 'https://' + host + '/models/1',
    tabTitle: '3DBenchy',
  }, Object.assign({}, s, { enabled: true, types: { '3mf': true } })) || '';
}

document.addEventListener('input', updateExample);
document.addEventListener('change', updateExample);
$('addSite').onclick = () => { addSiteRow({ folder: '', hosts: [] }); };
$('save').onclick = async () => {
  await chrome.storage.sync.set(collect());
  $('status').textContent = t('optSaved');
  setTimeout(() => { $('status').textContent = ''; }, 2000);
};
$('reset').onclick = () => render(MDS.mergeSettings({}));

chrome.storage.sync.get(null).then((stored) => render(MDS.mergeSettings(stored)));
