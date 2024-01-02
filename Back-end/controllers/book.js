const Book = require("../models/Book");
const fs = require("fs");
const average = require("../utils/average");
const eraseImg = require("../utils/eraseImg");

exports.postBook = async (req, res, next) => {
  try {
    const bookObject = JSON.parse(req.body.book);
    console.log(bookObject);

    const book = new Book({
      ...bookObject,
      userId: req.auth.userId,
      imageUrl: `${req.protocol}://${req.get(
        "host"
      )}/images/resized-${req.file.filename.replace(/\.[^.]*$/, "")}.webp`,
      ratings: {
        userId: req.auth.userId,
        grade: bookObject.ratings[0].grade,
      },
      averageRating: bookObject.ratings[0].grade,
    });

    await book.save();

    res.status(201).json({ message: "Objet enregistré !" });
  } catch (error) {
    if (error.name === "ValidationError") {
      res.status(400).json({
        error,
        message:
          "Tous les champs doivent être remplis et la date indiquée n'est pas valide. entre 0 et année actuelle",
      });

      if (req.file) {
        eraseImg(req.file.path);
      }
    } else if (error.code === 11000) {
      res.status(409).json({ error, message: "Ce livre est déja publié" });
      if (req.file) {
        eraseImg(req.file.path);
      }
    } else {
      console.error(
        "Une erreur s'est produite lors de l'enregistrement du livre :",
        error
      );
      res.status(500).json({
        error,
        message: "Une erreur s'est produite lors de l'enregistrement du livre.",
      });

      if (req.file) {
        eraseImg(req.file.path);
      }
    }
  }
};

exports.putBook = (req, res, next) => {
  Book.findOne({ _id: req.params.id })
    .then((book) => {
      if (!book) {
        return res.status(404).json({ message: "Livre non trouvé !" });
      }

      if (book.userId !== req.auth.userId) {
        return res.status(403).json({ message: "403: unauthorized request" });
      }

      const filename = book.imageUrl.split("/images/")[1];

      const bookObject = {
        ...JSON.parse(req.body.book),
        imageUrl: `${req.protocol}://${req.get(
          "host"
        )}/images/resized-${req.file.filename.replace(/\.[^.]*$/, "")}.webp`,
      };

      Book.updateOne({ _id: req.params.id }, { ...bookObject })
        .then(() => {
          if (req.file) {
            eraseImg(`./images/${filename}`);
          }
          res.status(200).json({ message: "Objet modifié !" });
        })
        .catch((error) => {
          console.error(
            "Une erreur s'est produite lors de la mise à jour du livre :",
            error
          );
          res.status(400).json({
            error,
            message:
              "Une erreur s'est produite lors de la mise à jour du livre.",
          });

          if (req.file) {
            eraseImg(req.file.path);
          }
        });
    })
    .catch((error) => {
      console.error(
        "Une erreur s'est produite lors de la mise à jour du livre :",
        error
      );
      res.status(500).json({
        error,
        message: "Une erreur s'est produite lors de la mise à jour du livre.",
      });

      if (req.file) {
        eraseImg(req.file.path);
      }
    });
};

exports.getAllBooks = (req, res, next) => {
  Book.find()
    .then((books) => res.status(200).json(books))
    .catch((error) =>
      res.status(400).json({
        error,
        message:
          "Une erreur s'est produite lors de la récupération des livres.",
      })
    );
};

exports.getOneBook = (req, res, next) => {
  Book.findOne({ _id: req.params.id })
    .then((book) => res.status(200).json(book))
    .catch((error) =>
      res.status(404).json({ error, message: "Livre non trouvé !" })
    );
};

exports.deleteBook = (req, res, next) => {
  Book.findOne({ _id: req.params.id })
    .then((book) => {
      if (book && book.userId != req.auth.userId) {
        res.status(401).json({ message: "Non autorisé" });
      } else {
        const filename = book.imageUrl.split("/images/")[1];
        fs.unlink(`images/${filename}`, () => {
          Book.deleteOne({ _id: req.params.id })
            .then(() => res.status(200).json({ message: "Objet supprimé !" }))
            .catch((error) =>
              res.status(401).json({
                error,
                message:
                  "Une erreur s'est produite lors de la suppression du livre.",
              })
            );
        });
      }
    })
    .catch((error) => {
      res.status(500).json({ error, message: "livre non trouvé" });
    });
};

exports.postRating = (req, res, next) => {
  const rating = parseInt(req.body.rating, 10);
  if (rating >= 1 && rating <= 5) {
    const ratingObject = { ...req.body, grade: rating };

    Book.findOne({ _id: req.params.id })
      .then((book) => {
        const newRatings = book.ratings;
        const userIdArray = newRatings.map((rating) => rating.userId);

        if (userIdArray.includes(req.auth.userId)) {
          res
            .status(403)
            .json({ message: "Vous avez déjà donné une note à ce livre." });
        } else {
          newRatings.push(ratingObject);

          const grades = newRatings.map((rating) => rating.grade);
          const averageGrades = average.average(grades);
          book.averageRating = averageGrades;

          Book.updateOne(
            { _id: req.params.id },
            {
              ratings: newRatings,
              averageRating: averageGrades,
              _id: req.params.id,
            }
          )
            .then(() => {
              res.status(201).json();
            })
            .catch((error) => {
              res.status(400).json({
                error,
                message:
                  "Une erreur s'est produite lors de la mise à jour du livre.",
              });
            });

          res.status(200).json(book);
        }
      })
      .catch((error) => {
        res.status(404).json({ error, message: "Livre non trouvé !" });
      });
  } else {
    res
      .status(400)
      .json({ message: "La note doit être comprise entre 1 et 5" });
  }
};

exports.getBestRating = (req, res, next) => {
  Book.find()
    .sort({ averageRating: -1 })
    .limit(3)
    .then((books) => {
      res.status(200).json(books);
    })

    .catch((error) => {
      res.status(500).json({
        error,
        message:
          "Une erreur s'est produite lors de la récupération des livres.",
      });
    });
};
