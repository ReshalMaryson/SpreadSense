import api from "../../../api/axios";

// send a message 
export const sendMessage=async (sheetId,message,setMessages)=>{
try{
    if(!sheetId || !message || message.trim() === ""){
        alert("please provide required values");

      return false;
    }
 const payload={
        sheetId,
        message:message.trim(),
    }
    const res=await api.post("/chat/",payload);
   
    if(res.status === 200){
        
    const newMessage = {
      role: "file",
      text:res.data.response,
      createdAt: new Date().toISOString(),
    };
       setMessages((prev) => [...prev, newMessage]);       
     return true;
    }
    
    return false;
}catch(err){
    console.log(err); 
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