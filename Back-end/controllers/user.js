const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const User = require("../models/user");

exports.signup = (req, res, next) => {
  User.findOne({ email: req.body.email })
    .then((existingUser) => {
      if (existingUser) {
        return res.status(400).json({ message: "Email déjà utilisé !" });
      }
      bcrypt
        .hash(req.body.password, 10)
        .then((hash) => {
          const user = new User({
            email: req.body.email,
            password: hash,
          });

          user
            .save()
            .then(() => res.status(201).json({ message: "Utilisateur créé !" }))
            .catch((error) =>
              res.status(400).json({ error, message: "Utilisateur non créé !" })
            );
        })
        .catch((error) =>
          res
            .status(500)
            .json({
              error,
              message: "Un problème est survenu sur le serveur !",
            })
        );
    })
    .catch((error) =>
      res
        .status(500)
        .json({ error, message: "Un problème est survenu sur le serveur !" })
    );
};

exports.login = (req, res, next) => {
  User.findOne({ email: req.body.email })
    .then((user) => {
      if (!user) {
        return res
          .status(401)
          .json({ message: "Ce mail n'est associé à aucun compte" });
      }

      bcrypt
        .compare(req.body.password, user.password)
        .then((valid) => {
          if (!valid) {
            return res.status(401).json({ message: "Mot de passe incorrect" });
          }

          res.status(200).json({
            userId: user._id,
            token: jwt.sign({ userId: user._id }, "RANDOM_TOKEN_SECRET", {
              expiresIn: "24h",
            }),
          });
        })
        .catch((error) =>
          res
            .status(500)
            .json({
              error,
              message: "un problème est survenue sur le serveur !",
            })
        );
    })
    .catch((error) =>
      res.status(400).json({ error, message: "Utilisateur non trouvée !" })
    );
};
