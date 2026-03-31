import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useDispatch } from 'react-redux';
import { addNotification } from '../store/slices/notificationSlice';
import toast from 'react-hot-toast';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const useSocket = (isAuthenticated) => {
  const socketRef = useRef(null);
  const dispatch = useDispatch();

  const emit = useCallback((event, data) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    socketRef.current = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Socket connected');
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    socket.on('notification', (notification) => {
      dispatch(addNotification(notification));
      toast(notification.message || notification.title, {
        icon: notification.type === 'success' ? '✅' : notification.type === 'error' ? '❌' : 'ℹ️',
      });
    });

    socket.on('payment:completed', ({ payment }) => {
      toast.success(`Payment of ${payment?.amount} BDT completed!`);
    });

    socket.on('user:created', ({ user }) => {
      toast.success(`New user ${user?.first_name} ${user?.last_name} joined!`);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated, dispatch]);

  return { socket: socketRef.current, emit };
};
