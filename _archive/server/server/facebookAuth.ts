import passport from 'passport';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

if (!process.env.FACEBOOK_CLIENT_ID || !process.env.FACEBOOK_CLIENT_SECRET) {
  // Do not throw here so app can still run if Facebook isn't configured in dev
  console.warn('Facebook OAuth credentials are not configured (FACEBOOK_CLIENT_ID / FACEBOOK_CLIENT_SECRET)');
} else {
  passport.use(
    new FacebookStrategy(
      {
        clientID: process.env.FACEBOOK_CLIENT_ID,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
        callbackURL: '/api/auth/facebook/callback',
        profileFields: ['id', 'emails', 'name', 'picture']
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value || '';

          // Check if user exists
          const [existingUser] = await db
            .select()
            .from(users)
            .where(eq(users.email, email));

          if (existingUser) {
            return done(null, existingUser);
          }

          // Create new user
          const [newUser] = await db
            .insert(users)
            .values({
              email,
              firstName: (profile.name as any)?.givenName,
              lastName: (profile.name as any)?.familyName,
              profileImageUrl: (profile.photos && profile.photos[0]) ? profile.photos[0].value : undefined,
            })
            .returning();

          return done(null, newUser);
        } catch (error) {
          return done(error as Error);
        }
      }
    )
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
}
