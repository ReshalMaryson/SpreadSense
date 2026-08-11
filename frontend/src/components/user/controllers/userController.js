import api from "../../../api/axios";

// get logged in user details
export const getUser = async (setUser) => {
  try {
    const res = await api.get(`/users/me`);
    setUser(res.data.user);
 
  } catch (err) {
    console.log(err.response?.data || err.message);
    console.log(err);
  }
};

// update user
export const updateUser = async (updateData, setUser) => {
  try {
    const res = await api.put("/users/me", updateData);
    if (res.status == 200) {
      if (setUser && typeof setUser === "function") {
        getUser(setUser);
      }
      return true;
    }
  } catch (err) {
    const errors = err.response?.data?.errors || [];
    errors.forEach((error) => {
      console.log(error.msg);
    });
    return false
  }
};

//delete logged in user's account
export const deleteAccount = async ( logoutReq, navigate, contextEmpty) => {
  try {
    // const res = await api.delete(`/users/${id}`);
    const res= await api.delete("/users/me");

    if (res.status == 200) {
      logoutReq(navigate, contextEmpty);
    }
  } catch (err) {
    console.log(err);
  }
};

// delete a user account
export const deleteUserAccount = async (id) => {
  try {
    const res = await api.delete(`/users/user/${id}`);
    // console.log(res);
    if (res.status == 200) {
      return;
    }
  } catch (err) {
    console.log(err);
  }
};
