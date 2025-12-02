exports.getUserProfile = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", req.user.id)
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ user: data });
  } catch (err) {
    console.error("getUserProfile error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.updatePlan = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { plan, status } = req.body;
    if (!plan || !status) {
      return res.status(400).json({ error: "Plan & status required" });
    }

    const { data, error } = await supabase
      .from("subscriptions")
      .upsert([{ 
        user_id: req.user.id, 
        plan, 
        status,
        updated_at: new Date()
      }], { 
        onConflict: "user_id" 
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ 
      message: "Plan updated successfully", 
      subscription: data 
    });
  } catch (err) {
    console.error("updatePlan error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};