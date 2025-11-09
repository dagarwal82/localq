import express from 'express';
import passport from 'passport';
import { generateToken } from '../auth';

const router = express.Router();

router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  (req, res) => {
    if (!req.user) {
      return res.redirect('/login?error=auth_failed');
    }

    const token = generateToken(req.user);
    
    // Redirect to the frontend with the token
    res.redirect(`/?token=${token}`);
  }
);

export default router;