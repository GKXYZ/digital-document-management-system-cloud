const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const crypto = require('crypto');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || 'PLACEHOLDER_CLIENT_ID',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'PLACEHOLDER_CLIENT_SECRET',
      callbackURL: '/api/auth/google/callback',
      proxy: true
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        
        // Find user by email
        let user = await User.findOne({ email });

        if (!user) {
          // Create a new user without a password
          user = await User.create({
            name: profile.displayName,
            email: email,
            password: crypto.randomBytes(20).toString('hex') + 'A1!', // Secure random placeholder
            isEmailVerified: true,
            avatar: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : undefined,
          });
        }

        return done(null, user);
      } catch (error) {
        console.error('Google Auth Error:', error);
        return done(error, null);
      }
    }
  )
);
