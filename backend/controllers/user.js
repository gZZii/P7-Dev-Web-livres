const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const User = require('../models/User');


// Fonction pour l'inscription d'un nouvel utilisateur
exports.signup = (req, res, next) => {
    // Hachage du mot de passe avec bcrypt
    bcrypt.hash(req.body.password, 10)
        .then(hash => {
            const user = new User({
                email: req.body.email,
                password: hash
            });
            // Enregistrement de l'utilisateur dans la base de données
            user.save()
                .then(() => res.status(201).json({ message: 'Utilisateur créé !' }))
                .catch(error => res.status(400).json({ error }));
        })
        .catch(error => res.status(500).json({ error }));
};

// Fonction pour la connexion d'un utilisateur existant
exports.login = (req, res, next) => {
    User.findOne({ email: req.body.email })
    .then(user => {
        // Si l'utilisateur n'est pas trouvé, renvoie d'une erreur
        if (!user) {
            return res.status(401).json({ error: 'Paire identifiant /mot de passe incorrect !' });
        }
        bcrypt.compare(req.body.password, user.password)
            .then(valid => {
                if (!valid) {
                    // Si le mot de passe ne correspond pas, renvoie d'une erreur
                    return res.status(401).json({ error: 'Paire identifiant /mot de passe incorrect !' });
                }
                // Si tout est correct, renvoie de l'ID de l'utilisateur et d'un token JWT
                res.status(200).json({
                    userId: user._id,
                    token: jwt.sign(
                        { userId: user._id },
                        process.env.SECRET_KEY,
                        { expiresIn: '24h' },
                    )
                });
            })
            .catch(error => res.status(500).json({ error }));
    })
};
