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

// get files which user has chated with.
export const getChatHistory=async (setHistory)=>{
  try{
  const res=await api.get("/chat/");
        if(res.status===200){
            setHistory(res.data.chats);
            return true;
          }
          setHistory([]);
        return false;
  }catch(err){
        console.log(err); 
        setHistory([]); 
        return false; 
  }
}

// get pagninated messages
export const getMessages=async(sheetId,setMessages)=>{
  try{
    const res=await api.get(`/chat/${sheetId}/messages`);
    if(res.status === 200){
        setMessages(res.data.messages);
        return true;
    }
    setMessages([]);
    return false;
  }catch(err){
      console.log(err);
      setMessages([]);
      return false;

  }
}

// load more from pagination
const loadMoreMessages = async (messages,setMessages,setHasMore) => {
    if (messages.length === 0) return;

    const oldestMessage = messages[0];

    try {
        const res = await api.get(
            `/chat/${sheetId}/messages`,
            {
                params: {
                    before: oldestMessage.createdAt
                }
            }
        );

        if (res.status === 200) {
            setMessages(prev => [
                ...res.data.messages,
                ...prev
            ]);

            setHasMore(res.data.hasMore);
        }

    } catch (err) {
        console.log(err);
    }
};