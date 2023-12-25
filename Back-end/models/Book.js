const mongoose = require('mongoose');

const bookSchema = mongoose.Schema({
  userId: { type: String, required: [true, "Le champ userId est requis."] },
  title: { type: String, required: [true, "Le champ title est requis."] ,lowercase: true},
  author: { type: String, required: [true, "Le champ auteur est requis."] ,lowercase: true},
  imageUrl: { type: String, required: [true, "Le champ imageUrl est requis."] },
  year: { 
    type: Number, 
    required: [true, "Le champ année est requis."],
    min: [0, "La date indiquée ne peut pas être inférieure à 0."],
    max: [new Date().getFullYear(), `La date indiquée ne peut pas être supérieure à l'année en cours.`]
  },
  genre: { type: String, required: [true, "Le champ genre est requis."] },
  ratings: [
    {
      userId: { type: String },
      grade: { type: Number },
    }
  ],
  averageRating: { type: Number },
  timescamp: { type: Date, default: Date.now },
});

bookSchema.index({ title: 1, author: 1 }, { unique: true });

module.exports = mongoose.model('Book', bookSchema);
