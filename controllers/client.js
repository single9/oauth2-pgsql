const express = require('express');
const router = express.Router();

router.get('/', (req,res) => res.render('clientAuthenticate.html'));
router.get('/app', (req,res) => res.render('client.html'));

module.exports = router;
