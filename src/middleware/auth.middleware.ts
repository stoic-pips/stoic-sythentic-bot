const jwt = require('jsonwebtoken');

const supabase = require('../config/supabase').supabase;

exports.authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    // Option A: Verify with Supabase
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error || !data.user) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    // Use Supabase user data
    req.user = {
      id: data.user.id,
      email: data.user.email,
      // Get subscription from user_metadata or profiles table
      subscription_status: data.user.user_metadata?.subscription_status || 'free'
    };
    
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

exports.requirePaidUser = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Check if user has paid subscription
  // Adjust this logic based on your user structure
  const hasPaidSubscription = req.user.subscription_status === 'active' || 
                             req.user.subscription_status === 'premium';
  
  if (!hasPaidSubscription) {
    return res.status(403).json({ error: 'Paid subscription required' });
  }

  next();
};