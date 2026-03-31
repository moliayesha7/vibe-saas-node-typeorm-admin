import { createSlice } from '@reduxjs/toolkit';

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: {
    items: [],
    unreadCount: 0,
  },
  reducers: {
    addNotification: (state, action) => {
      state.items.unshift(action.payload);
      if (!action.payload.is_read) state.unreadCount++;
    },
    setNotifications: (state, action) => {
      state.items = action.payload;
    },
    setUnreadCount: (state, action) => {
      state.unreadCount = action.payload;
    },
    markAsRead: (state, action) => {
      const item = state.items.find(n => n.id === action.payload);
      if (item && !item.is_read) {
        item.is_read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    markAllAsRead: (state) => {
      state.items.forEach(n => { n.is_read = true; });
      state.unreadCount = 0;
    },
  },
});

export const { addNotification, setNotifications, setUnreadCount, markAsRead, markAllAsRead } = notificationSlice.actions;
export const selectNotifications = (state) => state.notifications.items;
export const selectUnreadCount = (state) => state.notifications.unreadCount;
export default notificationSlice.reducer;
