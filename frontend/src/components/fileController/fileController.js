import api from "../../api/axios";

// get loggedin user's uploaded files.
export const getUserAllFiles = async (setUserFiles) => {
  try {
    const { data } = await api.get("/files/me");
    if (!data.files || data.files.length === 0) {
      console.log("no file found");
      setUserFiles([]);
      return false;
    }
    setUserFiles(data.files);
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};

// delete an uploaded file(single)
export const deleteUploadedFile = async (fileid) => {
  try {
    const res = await api.delete(`/files/${fileid}`);
    if(!res.data){
        return false;
    }
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};