const chatRepository = require("../../data/chat/chat-queries");

const sendMessage = async (data, err) => {
    try {
        data.date = new Date();
        const conversation = await chatRepository.saveConvertaion(data);
        data.cnvId = conversation.id;
        await chatRepository.saveMessage(data);
    } catch (e) {
        console.log(e);
    }
};

const getConversations = async (userID) => {
    const conversations = await chatRepository.getConversations(userID);

    const updatedConversations = conversations.map((conversation) => ({
        name: conversation.username,
        avatar: conversation.avatar,
        lastMessage: conversation.last_message,
        date: calculateDate(conversation.date),
        isRead: conversation.is_read,
    }));
    // conversations = conversations.map((conversation) => {
    //     conversation.avatar = conversation.avatar || "https://i.imgur.com/10Wf8Zt.png";
    // }
    console.log(updatedConversations);
    return updatedConversations;
};

const calculateDate = (date) => {
    const currentDate = new Date();
    const dateDiffrentInMs = currentDate.getTime() - date.getTime();
    let ret;
    console.log(dateDiffrentInMs);
    if (dateDiffrentInMs < 60 * 60 * 1000) {
        ret = Math.trunc(dateDiffrentInMs / (60 * 1000)) + "m ago";
    } else if (dateDiffrentInMs < 24 * 60 * 60 * 1000) {
        ret = Math.trunc(dateDiffrentInMs / (60 * 60 * 1000)) + "h ago";
    } else if (7 * 24 * 60 * 60 * 1000) {
        ret = Math.trunc(dateDiffrentInMs / (24 * 60 * 60 * 1000)) + "d ago";
    } else if (30 * 24 * 60 * 60 * 1000) {
        ret =
            Math.trunc(dateDiffrentInMs / (7 * 24 * 60 * 60 * 1000)) + "w ago";
    }
    console.log(Math.trunc(dateDiffrentInMs / (60 * 60 * 1000)));
    return ret;
};
module.exports = {
    sendMessage,
    getConversations,
};
