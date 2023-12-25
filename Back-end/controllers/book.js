const Book = require('../models/book');
const fs = require('fs');
const average = require('../utils/average');
const eraseImg = require('../utils/eraseImg');




// POST a book
exports.postBook = async (req, res, next) => {
  try {
    // Parsing du livre depuis la requête
    const bookObject = JSON.parse(req.body.book);
    console.log(bookObject); // bookObject is an object

    // Création d'une nouvelle instance de Book
    const book = new Book({
      ...bookObject,
      userId: req.auth.userId,
      imageUrl: `${req.protocol}://${req.get('host')}/images/resized-${req.file.filename.replace(/\.[^.]*$/, '')}.webp`,
      ratings: {
        userId: req.auth.userId,
        grade: bookObject.ratings[0].grade,
      },
      averageRating: bookObject.ratings[0].grade,
    });

    // Sauvegarde du livre dans la base de données
    await book.save();

    // Répond avec un statut 201 (Created) et un message de succès
    res.status(201).json({ message: 'Objet enregistré !' });
  } catch (error) {
    // Vérifier le type d'erreur et personnaliser le message en fonction de l'erreur spécifique
    if (error.name === 'ValidationError') {
      // Gérer l'erreur de validation (par exemple, la date n'est pas entre 0 et l'année en cours)
      res.status(400).json({ error, message: "Tous les champs doivent être remplis et la date indiquée n'est pas valide. entre 0 et année actuelle" });
      
      // Effacement de l'image en cas d'erreur 400
      if (req.file) {
        eraseImg(req.file.path);
      }
    } else if (error.code === 11000) {
      // Gérer l'erreur de duplication (par exemple, un livre avec le même titre et le même auteur existe déjà)
      res.status(409).json({ error, message: 'Ce livre est déja publié' });
      if (req.file) {
        eraseImg(req.file.path);
      }
    } else {
      // Gérer toutes les autres erreurs
      console.error('Une erreur s\'est produite lors de l\'enregistrement du livre :', error);
      res.status(500).json({ error, message: 'Une erreur s\'est produite lors de l\'enregistrement du livre.' });
      
      // Effacement de l'image en cas d'erreur 500
      if (req.file) {
        eraseImg(req.file.path);
      }
    }
  }
};




exports.putBook = (req, res, next) => {
  // Récupération du livre existant à modifier
  Book.findOne({ _id: req.params.id })
    .then((book) => {
      // Vérifier si le livre existe
      if (!book) {
        return res.status(404).json({ message: 'Livre non trouvé !' });
      }

      // Vérifier si l'utilisateur est le créateur du livre
      if (book.userId !== req.auth.userId) {
        return res.status(403).json({ message: '403: unauthorized request' });
      }

      // Séparation du nom du fichier image existant
      const filename = book.imageUrl.split('/images/')[1];

      // Mise à jour du livre avec les données de req.body
      const bookObject = {
        ...JSON.parse(req.body.book),
        imageUrl: `${req.protocol}://${req.get('host')}/images/resized-${req.file.filename.replace(/\.[^.]*$/, '')}.webp`,
      };

      // Mise à jour du livre
      Book.updateOne({ _id: req.params.id }, { ...bookObject })
        .then(() => {
          // Supprimer l'ancienne image si elle a été modifiée avec la requête
          if (req.file) {
            eraseImg(`./images/${filename}`);
          }
          res.status(200).json({ message: 'Objet modifié !' });
        })
        .catch((error) => {
          // Gérer l'erreur de mise à jour du livre
          console.error('Une erreur s\'est produite lors de la mise à jour du livre :', error);
          res.status(400).json({ error, message: 'Une erreur s\'est produite lors de la mise à jour du livre.' });
          // Supprimer l'image en cas d'erreur 400
          if (req.file) {
            eraseImg(req.file.path);
          }
        });
    })
    .catch((error) => {
      // Gérer toutes les autres erreurs
      console.error('Une erreur s\'est produite lors de la mise à jour du livre :', error);
      res.status(500).json({ error, message: 'Une erreur s\'est produite lors de la mise à jour du livre.' });

      // Supprimer l'image en cas d'erreur 500
      if (req.file) {
        eraseImg(req.file.path);
      }
    });
};


// GET all books
exports.getAllBooks = (req, res, next) => {
  Book.find()
      .then((books) => res.status(200).json(books))
      .catch((error) => res.status(400).json({ error, message: 'Une erreur s\'est produite lors de la récupération des livres.' }));
};

// GET one book
exports.getOneBook = (req, res, next) => {
   Book.findOne({ _id: req.params.id })
       .then((book) => res.status(200).json(book))
       .catch((error) => res.status(404).json({ error, message: 'Livre non trouvé !' }));

 }

// Delete a book
exports.deleteBook = (req, res, next) => {
    // Rechercher le livre par son ID dans la base de données
    Book.findOne({ _id: req.params.id })
        .then((book) => {
            // Vérifier si le livre existe et s'il appartient à l'utilisateur authentifié
            if (book && book.userId != req.auth.userId) {
                // Si le livre n'appartient pas à l'utilisateur, renvoyer un statut 401 (Non autorisé) avec un message d'erreur
                res.status(401).json({ message: 'Non autorisé' });
            } else {
                // Si le livre appartient à l'utilisateur, supprimer l'image associée au livre
                const filename = book.imageUrl.split('/images/')[1];
                fs.unlink(`images/${filename}`, () => {
                    // Supprimer le livre de la base de données
                    Book.deleteOne({ _id: req.params.id })
                        .then(() =>
                            // Renvoyer un statut 200 (OK) avec un message de succès
                            res.status(200).json({ message: 'Objet supprimé !' })
                        )
                        .catch((error) => res.status(401).json({ error, message: 'Une erreur s\'est produite lors de la suppression du livre.' }));
                });
            }
        })
        .catch((error) => {
            // Renvoyer un statut 500 (Internal Server Error) avec un message d'erreur en cas d'erreur lors de la recherche du livre
            res.status(500).json({ error, message:'livre non trouvé' });
        });

};

// POST a rating
exports.postRating = (req, res, next) => {
  // On vérifie que la note est comprise entre 1 et 5 et n'est pas égale à 0
  const rating = parseInt(req.body.rating, 10); // Parse la note en tant qu'entier
  if (rating >= 1 && rating <= 5) {
    // Stockage de la requête dans une constante
    const ratingObject = { ...req.body, grade: rating };

    // Récupération du livre auquel on veut ajouter une note
    Book.findOne({ _id: req.params.id })
      .then((book) => {
        // Création d'un tableau regroupant toutes les userId des utilisateurs ayant déjà noté le livre en question
        const newRatings = book.ratings;
        const userIdArray = newRatings.map((rating) => rating.userId);
        // On vérifie que l'utilisateur authentifié n'a jamais donné de note au livre en question
        if (userIdArray.includes(req.auth.userId)) {
          // Si l'utilisateur a déjà donné une note au livre, renvoyer un statut 403 (Forbidden) avec un message d'erreur
          res.status(403).json({ message: 'Vous avez déjà donné une note à ce livre.' });
        } else {
          // Ajout de la note
          newRatings.push(ratingObject);
          // Création d'un tableau regroupant toutes les notes du livre, et calcul de la moyenne des notes
          const grades = newRatings.map((rating) => rating.grade);
          const averageGrades = average.average(grades);
          book.averageRating = averageGrades;
          // Mise à jour du livre avec la nouvelle note ainsi que la nouvelle moyenne des notes
          Book.updateOne({ _id: req.params.id }, { ratings: newRatings, averageRating: averageGrades, _id: req.params.id })
            .then(() => {
              // Renvoyer un statut 201 (Created) avec une réponse vide indiquant que la note a été ajoutée avec succès
              res.status(201).json();
            })
            .catch((error) => {
              // Renvoyer un statut 400 (Bad Request) avec un message d'erreur en cas d'erreur lors de la mise à jour du livre
              res.status(400).json({ error, message: 'Une erreur s\'est produite lors de la mise à jour du livre.' });
            });
          // Renvoyer le livre en tant que réponse JSON avec le statut 200 (OK)
          res.status(200).json(book);
        }
      })
      .catch((error) => {
        // Renvoyer un statut 404 (Not Found) avec un message d'erreur en cas d'erreur lors de la recherche du livre
        res.status(404).json({ error, message: 'Livre non trouvé !' });
      });
  } else {
    // Renvoyer un statut 400 (Bad Request) avec un message d'erreur si la note n'est pas comprise entre 1 et 5 ou si elle est égale à 0
    res.status(400).json({ message: 'La note doit être comprise entre 1 et 5' });
  }
};

// GET best rated books
// Cette fonction de contrôleur récupère les trois livres ayant les meilleures notes (averageRating) dans la base de données MongoDB
exports.getBestRating = (req, res, next) => {
  //Recherche des livres dans la collection "books" de la base de données
  Book.find()
    //Trier les résultats en fonction de la propriété "averageRating" en ordre décroissant (les meilleures notes d'abord)
    .sort({ averageRating: -1 })
    //Limiter le nombre de résultats renvoyés à 3 (les trois livres ayant les meilleures notes)
    .limit(3)
    //Exécuter la requête et traiter les résultats
    .then((books) => {
      //Renvoyer une réponse JSON avec les livres ayant les meilleures notes (status HTTP 200 OK)
      res.status(200).json(books);
    })
    //Capturer les erreurs éventuelles lors de l'exécution de la requête
    .catch((error) => {
      //Renvoyer une réponse JSON avec l'erreur (status HTTP 500 Internal Server Error)
      res.status(500).json({ error, message: 'Une erreur s\'est produite lors de la récupération des livres.' });
    });
};

