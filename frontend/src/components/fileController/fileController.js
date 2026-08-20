import api from "../../api/axios";

// get loggedin user's uploaded files.
export const getUserAllFiles = async (setUserFiles) => {
  try {
    const { data } = await api.get("/files/myfiles");
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

// upload a file.
export const uploadExcelFile=async(e)=>{
   const file = e.target.files[0];
  if (!file) return;
  try{
    const formData = new FormData();
    formData.append("excelFile", file);

    const response = await api.post("/files/upload", formData);
      if(response.status != 201){ 
        return false
      }
     return response.data.file;
  }catch(error){
     console.log(error);
     alert(error); 
     return false;
    }
}

//download an uploaded file
export const downloadFile = async (sheetId) => {
  try {
    const res = await api.get(`/files/download/${sheetId}`, {
      responseType: "blob",
    });

    const url = URL.createObjectURL(res.data);

    const a = document.createElement("a");
    a.href = url;
    a.download = "download.xlsx";
    a.click();

    URL.revokeObjectURL(url);

    return true;
  } catch (err) {
    console.log(err);
    return false;
  }
};

// search files by name
export const getFilesByName = async (name, setFiles) => {
  try {
    if (!name || !name.trim()) {
      return false;
    }

    const res = await api.get(
      `/files/search/${encodeURIComponent(name.trim())}`
    );

    if (res.status === 200) {
      setFiles(res.data.data);
      return true;
    }

    return false;

  } catch (err) {
    console.log(err);
    return false;
  }
};