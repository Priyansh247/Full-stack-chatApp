import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      // Update messages immediately for the sender
      set({ messages: [...messages, res.data] });
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;
    if (!socket) {
      console.error("Socket not connected");
      return;
    }

    // Remove any existing message listeners
    socket.off("newMessage");

    socket.on("newMessage", (newMessage) => {
      console.log("New message received:", newMessage);
      
      // Check if the message is for the current conversation
      const isMessageForCurrentConversation = 
        (newMessage.senderId === selectedUser._id && newMessage.receiverId === get().authUser._id) ||
        (newMessage.receiverId === selectedUser._id && newMessage.senderId === get().authUser._id);

      if (isMessageForCurrentConversation) {
        set((state) => {
          // Check if message already exists to prevent duplicates
          const messageExists = state.messages.some(msg => msg._id === newMessage._id);
          if (messageExists) return state;
          
          return {
            messages: [...state.messages, newMessage],
          };
        });
      }
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) {
      socket.off("newMessage");
    }
  },

  setSelectedUser: (selectedUser) => set({ selectedUser }),
}));