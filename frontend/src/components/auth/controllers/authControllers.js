import api from "../../../api/axios";

//login
export const loginAttempt = async (user, navigate, login, setErrorMessage) => {
  if (!user.email || !user.password) {
    setErrorMessage("Missing required fields.");
    return;
  }

  try {
    const res = await api.post("/auth/login", user); 
    if(res.status == 200){
      login(res.data.data);

        navigate("/", {
          replace: true,
          state: { reloadAfterLogin: true },
        });
    }
    console.log(res.data);
    
  

  } catch (err) {
    console.log(err);
    const msg = err.response?.data?.message || "Something went wrong. Please try again.";
    setErrorMessage(msg);
  }
};

//google login
export const googleLoginAttempt = async (accessToken, navigate, login) => {
  try {
    const res = await api.post("/auth/google", { accessToken });
    login(res.data.data);

    navigate("/", {
      replace: true,
      state: { reloadAfterLogin: true },
    });
  } catch (err) {
    console.log(err.response?.data || err.message);
  }
};



// logout
export const logoutAttempt = async (navigate, logout) => {
  try {
    await api.post("/auth/logout");
    navigate("/");    
    logout();
  } catch (err) {
    console.log(err.response?.data || err.message);
  }
};

//sign up
//  - validate fields to create user
const validate = (formData) => {
  if (
    !formData.name ||
    !formData.email ||
    !formData.password 
  ) {
    return "Missing required fields.";
  }

  if (formData.password.length < 6) {
    return "Password must be at least 6 characters";
  }

  const emailRegex = /\S+@\S+\.\S+/;
  if (!emailRegex.test(formData.email)) {
    return "Invalid email format";
  }

  return null;
};

// - sign up request
export const signUp = async (
  navigate,
  formData,
  setFormData,
  setErrMessage,
  setLoading,
) => {
  const error = validate(formData);
  if (error) {
    setErrMessage(error);
    return;
  }

  setLoading(true);
  setErrMessage("");
  try {
    const res = await api.post("/users", formData, {
      headers: { "Content-Type": "application/json" },
    });

    if (res.status == 201) {
      // clear the form fields
      setFormData({
        name: "",
        email: "",
        password: ""
      });

      // direct to login page
      navigate("/login");
    }
  } catch (err) {
    setFormData((prev) => ({
      ...prev,
      password: "",
    }));
    setErrMessage(err.response?.data?.message || "Something went wrong");
  } finally {
    setLoading(false);
  }
};
