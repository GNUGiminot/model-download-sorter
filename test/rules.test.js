const test = require('node:test');
const assert = require('node:assert/strict');
const MDS = require('../rules.js');

const D = MDS.DEFAULT_SETTINGS;
const flat = Object.assign({}, D, { perModelFolder: false });

test('MakerWorld 3MF from the CDN, page in referrer', () => {
  assert.equal(MDS.chooseFolder({
    filename: 'Benchy.3mf',
    url: 'https://makerworld.bblmw.com/makerworld/model/abc/Benchy.3mf?sig=1',
    referrer: 'https://makerworld.com/en/models/123',
  }, flat), '3D Models/MakerWorld/Benchy.3mf');
});

test('Printables STL by finalUrl only', () => {
  assert.equal(MDS.chooseFolder({
    filename: 'part.stl', url: 'https://example.net/redirect', finalUrl: 'https://files.printables.com/media/part.stl',
  }, flat), '3D Models/Printables/part.stl');
});

test('Thingiverse ZIP from the CDN', () => {
  assert.equal(MDS.chooseFolder({ filename: 'thing.zip', url: 'https://cdn.thingiverse.com/x/thing.zip' }, flat),
    '3D Models/Thingiverse/thing.zip');
});

test('blob: download falls back to the active tab', () => {
  assert.equal(MDS.chooseFolder({
    filename: 'gear.step', url: 'blob:https://makerworld.com/1234-uuid', tabUrl: 'https://makerworld.com/models/9',
  }, flat), '3D Models/MakerWorld/gear.step');
  assert.equal(MDS.chooseFolder({
    filename: 'gear.step', url: 'blob:null/1234', tabUrl: 'https://www.printables.com/model/9',
  }, flat), '3D Models/Printables/gear.step');
});

test('model from an unknown site goes to Other, ZIP from it is left alone', () => {
  assert.equal(MDS.chooseFolder({ filename: 'vase.stl', referrer: 'https://cults3d.com/en/3d-model/x' }, flat),
    '3D Models/Other/vase.stl');
  assert.equal(MDS.chooseFolder({ filename: 'photos.zip', referrer: 'https://cults3d.com/en/3d-model/x' }, flat), null);
});

test('other file types and disabled types are not moved', () => {
  assert.equal(MDS.chooseFolder({ filename: 'manual.pdf', referrer: 'https://makerworld.com/' }, flat), null);
  assert.equal(MDS.chooseFolder({ filename: 'noext', referrer: 'https://makerworld.com/' }, flat), null);
  const noStl = Object.assign({}, flat, { types: { stl: false } });
  assert.equal(MDS.chooseFolder({ filename: 'a.STL', referrer: 'https://makerworld.com/' }, noStl), null);
  assert.equal(MDS.chooseFolder({ filename: 'a.STL', referrer: 'https://makerworld.com/' }, flat), '3D Models/MakerWorld/a.STL');
});

test('turned off', () => {
  assert.equal(MDS.chooseFolder({ filename: 'a.stl', referrer: 'https://makerworld.com/' },
    Object.assign({}, D, { enabled: false })), null);
});

test('host matching does not accept look-alikes', () => {
  assert.equal(MDS.siteForUrl('https://notmakerworld.com/x', D.sites), null);
  assert.equal(MDS.siteForUrl('https://makerworld.com.evil.io/x', D.sites), null);
  assert.equal(MDS.siteForUrl('https://www.thingiverse.com/thing:1', D.sites).folder, 'Thingiverse');
});

test('per-model subfolder from the page title', () => {
  assert.equal(MDS.chooseFolder({
    filename: 'Benchy_plate.3mf', referrer: 'https://makerworld.com/en/models/1',
    tabUrl: 'https://makerworld.com/en/models/1', tabTitle: '3DBenchy: the jolly torture test - MakerWorld',
  }, D), '3D Models/MakerWorld/3dbenchy-the-jolly-torture-test/Benchy_plate.3mf');
  assert.equal(MDS.chooseFolder({
    filename: 'clip.stl', url: 'https://files.printables.com/clip.stl',
    tabUrl: 'https://www.printables.com/model/5', tabTitle: 'Cable clip by Joe | Download free STL model | Printables.com',
  }, D), '3D Models/Printables/cable-clip-by-joe/clip.stl');
});

test('per-model subfolder ignores a tab on another site', () => {
  assert.equal(MDS.chooseFolder({
    filename: 'clip.stl', referrer: 'https://www.printables.com/model/5',
    tabUrl: 'https://mail.example.com/', tabTitle: 'Inbox',
  }, D), '3D Models/Printables/clip/clip.stl');
});

test('Other site uses the tab title only when the tab is the source page', () => {
  assert.equal(MDS.chooseFolder({
    filename: 'vase.stl', referrer: 'https://cults3d.com/en/3d-model/vase',
    tabUrl: 'https://cults3d.com/en/3d-model/vase', tabTitle: 'Spiral vase - Cults',
  }, D), '3D Models/Other/vase/vase.stl');
  assert.equal(MDS.chooseFolder({
    filename: 'vase.stl', referrer: 'https://cults3d.com/x', tabUrl: 'https://news.example/', tabTitle: 'News',
  }, D), '3D Models/Other/vase/vase.stl');
});

test('unsafe names are cleaned', () => {
  assert.equal(MDS.safeName('a<b>:c"d/e\\f|g?h*  end. '), 'a b c d e f g h end');
  assert.equal(MDS.safeName('CON'), '_CON');
  assert.equal(MDS.safeName('..hidden'), 'hidden');
  assert.equal(MDS.chooseFolder({ filename: 'x.stl', referrer: 'https://makerworld.com/' },
    Object.assign({}, flat, { root: '../..//Models\\3D' })), 'Models/3D/MakerWorld/x.stl');
});

test('user sites and folders from settings', () => {
  const s = Object.assign({}, flat, {
    root: '', otherFolder: 'Прочее',
    sites: [{ folder: 'Cults', hosts: ['cults3d.com'] }],
  });
  assert.equal(MDS.chooseFolder({ filename: 'a.stl', referrer: 'https://cults3d.com/x' }, s), 'Cults/a.stl');
  assert.equal(MDS.chooseFolder({ filename: 'a.stl', referrer: 'https://makerworld.com/' }, s), 'Прочее/a.stl');
});

test('short Latin model folder names', () => {
  assert.equal(MDS.chooseFolder({
    filename: 'Original_3DBenchy_3Dprintconcept.3mf', url: 'blob:https://makerworld.com/abc',
    tabUrl: 'https://makerworld.com/ru/models/1123776-original-3d-benchy?from=search#profileId-1355120',
    tabTitle: 'Оригинальный 3D Benchy — бесплатная модель для 3D-печати — MakerWorld',
  }, D), '3D Models/MakerWorld/original-3d-benchy/Original_3DBenchy_3Dprintconcept.3mf');
  assert.equal(MDS.chooseFolder({
    filename: 'a.stl', referrer: 'https://www.printables.com/model/12345-cable-clip-for-desk/files',
  }, D), '3D Models/Printables/a/a.stl');
  assert.equal(MDS.chooseFolder({
    filename: 'a.stl', referrer: 'https://www.printables.com/model/12345-cable-clip-for-desk',
  }, D), '3D Models/Printables/cable-clip-for-desk/a.stl');
  assert.equal(MDS.chooseFolder({
    filename: 'x.stl', url: 'https://cdn.thingiverse.com/x.stl', tabUrl: 'https://www.thingiverse.com/thing:763622',
    tabTitle: 'Держатель для катушки — большой | Thingiverse',
  }, D), '3D Models/Thingiverse/derzhatel-dlya-katushki/x.stl');
  assert.equal(MDS.modelNameFromTitle('3DBenchy: the jolly torture test - MakerWorld'), '3dbenchy-the-jolly-torture-test');
  assert.equal(MDS.shortName('A very long model name that goes on and on beyond forty chars'), 'a-very-long-model-name-that-goes-on-and');
  assert.equal(MDS.modelNameFromUrl('https://cults3d.com/en/3d-model/home/spiral-vase'), 'spiral-vase');
  assert.equal(MDS.shortName('Ёжик в тумане'), 'ezhik-v-tumane');
});
