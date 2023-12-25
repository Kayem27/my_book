// Importation des dépendances
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Importation du modèle User
const User = require("../models/user");

// Route pour créer un nouvel utilisateur
exports.signup = (req, res, next) => {
  // Vérifier si un utilisateur existe déjà avec le même email
  User.findOne({ email: req.body.email })
    .then(existingUser => {
      if (existingUser) {
        // Si un utilisateur existant avec le même email est trouvé,
        // renvoyer une réponse d'erreur personnalisée
        return res.status(400).json({ message: "Email déjà utilisé !" });
      }

      // Si aucun utilisateur existant avec le même email n'est trouvé, procéder à la création du nouvel utilisateur
      // Hashage du mot de passe fourni par l'utilisateur (avec un coût de 10)
      bcrypt.hash(req.body.password, 10)
        .then(hash => {
          // Création d'un nouvel utilisateur avec l'email et le mot de passe hashé
          const user = new User({
            email: req.body.email,
            password: hash,
          });

          // Sauvegarde du nouvel utilisateur dans la base de données
          user.save()
            .then(() => res.status(201).json({ message: "Utilisateur créé !" }))
            .catch(error => res.status(400).json({ error, message: "Utilisateur non créé !" }));
        })
        .catch(error => res.status(500).json({ error, message: "Un problème est survenu sur le serveur !" }));
    })
    .catch(error => res.status(500).json({ error, message: "Un problème est survenu sur le serveur !" }));
};


// Route pour authentifier un utilisateur
exports.login = (req, res, next) => {
  // Recherche de l'utilisateur dans la base de données en utilisant son email
  User.findOne({ email: req.body.email })
    .then((user) => {
      // Vérification si l'utilisateur existe dans la base de données
      if (!user) {
        return res
          .status(401)
          .json({ message: "Paire login/mot de passe incorrecte" });
      }

      // Comparaison du mot de passe fourni avec le mot de passe hashé stocké dans la base de données
      bcrypt
        .compare(req.body.password, user.password)
        .then((valid) => {
          // Vérification si le mot de passe est correct
          if (!valid) {
            return res
              .status(401)
              .json({ message: "Paire login/mot de passe incorrecte" });
          }

          // Si le mot de passe est correct, génération d'un token JWT valide pour l'utilisateur
          res.status(200).json({
            userId: user._id,
            token: jwt.sign({ userId: user._id }, "RANDOM_TOKEN_SECRET", {
              expiresIn: "24h",
            }),
          });
        })
        .catch((error) => res.status(500).json({ error,message: "un problème est survenue sur le serveur !" }));
    })
    .catch((error) => res.status(400).json({ error,message: "Utilisateur non trouvée !" }));
};
