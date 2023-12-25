const fs = require('fs');

const eraseImg = (path) => {
  fs.unlink(path, (err) => {
    if (err) {
      console.error('Erreur pendant la suppression de l\'image :', err);
    }
  });
};

module.exports = eraseImg;
