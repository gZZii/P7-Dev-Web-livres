const Book = require("../models/Book");
const fs = require("fs");

// Récupérer tous les livres
exports.getAllBooks = (req, res, next) => {
  Book.find()
    .then((books) => res.status(200).json(books))
    .catch((error) => res.status(400).json({ error }));
};

// Récupérer un livre spécifique par son ID
exports.getOneBook = (req, res, next) => {
  Book.findOne({ _id: req.params.id })
    .then((book) => res.status(200).json(book))
    .catch((error) => res.status(404).json({ error }));
};

// Récupérer les livres avec les meilleures notes
exports.getBestRating = (req, res, next) => {
  Book.find()
    .sort({ averageRating: -1 })
    .limit(3)
    .then((books) => res.status(200).json(books))
    .catch((error) => res.status(400).json({ error }));
};

// Création d'un nouveau livre
exports.createBook = (req, res, next) => {
  const bookObject = JSON.parse(req.body.book);
  delete bookObject._id;
  delete bookObject._userId;
  const book = new Book({
    ...bookObject,
    userId: req.auth.userId, // permet de récupérer l'id de l'utilisateur
    imageUrl: `${req.protocol}://${req.get("host")}/images/${
      req.file.filename
    }`, // permet de générer l'url de l'image
  });
  book
    .save()
    .then(() => res.status(201).json({ message: "Objet enregistré !" }))
    .catch((error) => res.status(400).json({ error }));
};

// Modification d'un livre existant
exports.modifyBook = (req, res, next) => {
  // gestion de la modification de l'image du livre
  const bookObject = req.file
    ? {
        ...JSON.parse(req.body.book),
        imageUrl: `${req.protocol}://${req.get("host")}/images/${
          req.file.filename
        }`,
      }
    : { ...req.body };

  delete bookObject._userId;

  // Vérification des droits de modification du livre
  Book.findOne({ _id: req.params.id })
    .then((book) => {
      if (book.userId !== req.auth.userId) {
        return res.status(403).json({ message: "Unauthorized request" });
      }

      // Traitement de la note si elle est fournie
      const { userId, rating } = req.body;
      if (rating && rating >= 0 && rating <= 5) {
        const existingRatingIndex = book.ratings.findIndex(
          (r) => r.userId === userId
        );
        if (existingRatingIndex !== -1) {
          // Mise à jour de la note existante
          book.ratings[existingRatingIndex].grade = rating;
        } else {
          // Ajout d'une nouvelle note
          book.ratings.push({ userId, grade: rating });
        }
        // Recalcul de la note moyenne du livre
        const totalRatings = book.ratings.length;
        const sumRatings = book.ratings.reduce((sum, r) => sum + r.grade, 0);
        book.averageRating = parseFloat((sumRatings / totalRatings).toFixed(2));
      }

      const oldImageUrl = book.imageUrl;
      // Mise à jour des informations du livre dans la base de données
      Book.updateOne(
        { _id: req.params.id },
        { ...bookObject, _id: req.params.id, averageRating: book.averageRating }
      )
        .then(() => {
          if (req.file) {
            // Suppression de l'ancienne image si une nouvelle a été fournie
            const filename = oldImageUrl.split("/images/")[1];
            fs.unlink(`images/${filename}`, (err) => {
              if (err) {
                console.error("Error deleting old image:", err);
              }
            });
          }
          res.status(200).json({ message: "Livre modifié!" });
        })
        .catch((error) => res.status(401).json({ error }));
    })
    .catch((error) => res.status(400).json({ error }));
};

// Suppression d'un livre
exports.deleteBook = (req, res, next) => {
  Book.findOne({ _id: req.params.id })
    .then((book) => {
      if (book.userId != req.auth.userId) {
        // Vérification des droits de suppression du livre
        res.status(401).json({ message: "Not authorized" });
      } else {
        // Suppression de l'image du livre
        const filename = book.imageUrl.split("/images/")[1];
        fs.unlink(`images/${filename}`, () => {
          // Suppression du livre dans la base de données
          Book.deleteOne({ _id: req.params.id })
            .then(() => {
              res.status(200).json({ message: "Objet supprimé !" });
            })
            .catch((error) => res.status(401).json({ error }));
        });
      }
    })
    .catch((error) => {
      res.status(500).json({ error });
    });
};

// Ajout d'une note à un livre
exports.addRating = (req, res, next) => {
  const { userId, rating } = req.body;

  Book.findOne({ _id: req.params.id })
    .then(foundBook => {
      if (!foundBook) {
        // Vérification de l'existence du livre
        return res.status(404).json({ message: "Objet non trouvé." });
      }

      const ratingIndex = foundBook.ratings.findIndex(r => r.userId === userId);

      if (ratingIndex !== -1) {
        // Mise à jour de la note existante
        foundBook.ratings[ratingIndex].grade = rating;
      } else {
        // Ajout d'une nouvelle note
        foundBook.ratings.push({ userId, grade: rating });
      }
      
      // Recalcul de la note moyenne après ajout/mise à jour de la note
      const ratingsCount = foundBook.ratings.length;
      const ratingsSum = foundBook.ratings.reduce((acc, cur) => acc + cur.grade, 0);
      foundBook.averageRating = Number((ratingsSum / ratingsCount).toFixed(2));
      
      // Sauvegarde du livre modifié
      foundBook.save()
        .then(updatedBook => res.status(200).json(updatedBook))
        .catch(saveError => res.status(400).json({ error: saveError }));
    })
    .catch(findError => res.status(500).json({ error: findError.message }));
};