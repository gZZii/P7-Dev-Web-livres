const jwt = require('jsonwebtoken');
require('dotenv').config();


const { SECRET_KEY } = process.env;
// Middleware pour vérifier le token JWT et autoriser l'accès aux routes protégées -- tiré du cours
module.exports = (req, res, next) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const decodedToken = jwt.verify(token, SECRET_KEY);
        const userId = decodedToken.userId;
        req.auth = {
            userId: userId
            };
            next();
        }
    catch (error) {
        res.status(403).json({ error: 'Requête non authentifiée !' });
    }
};