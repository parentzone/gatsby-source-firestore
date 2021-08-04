const report = require('gatsby-cli/lib/reporter');
const firebase = require('firebase-admin');
const crypto = require('crypto');

const getDigest = id =>
  crypto
    .createHash('md5')
    .update(id)
    .digest('hex');

exports.sourceNodes = async (
  { actions },
  { types, credential }
) => {
  try {
    if (firebase.apps || !firebase.apps.length) {
      const cfg = appConfig ? appConfig : {credential: firebase.credential.cert(credential)}
      firebase.initializeApp(cfg);
    }
  } catch (e) {
    report.warn(
      'Could not initialize Firebase. Please check `credential` property in gatsby-config.js'
    );
    report.warn(e);
    return;
  }
  const db = firebase.firestore();
  db.settings({
    timestampsInSnapshots: true,
  });

  const { createNode, createNodeField } = actions;

  const promises = types.map(
    async ({ collection, type, map = node => node }) => {
      const snapshot = await db.collection(collection).get();
      for (let doc of snapshot.docs) {
        const contentDigest = getDigest(`id_${doc.id}`);
        const node = createNode(
          Object.assign({}, map(doc.data()), {
            id: `id_${doc.id}`,
            parent: null,
            children: [],
            internal: {
              type,
              contentDigest,
            },
          })
        );
        Promise.resolve();
      }
    }
  );
  await Promise.all(promises);
  return;
};
