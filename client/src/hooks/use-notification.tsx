import * as React from "react"
import type { Notification } from "@shared/schema"

const NOTIFICATION_LIMIT = 5
const NOTIFICATION_REMOVE_DELAY = 1000
const NOTIFICATION_AUTO_DISMISS = 5000 // 5 seconds

type NotificationToast = {
  id: string
  type: "profile_view" | "message_received"
  fromUserName: string
  fromUserPhoto?: string
  fromUserId?: string
  notificationId?: string
  title: string
  description?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onClick?: () => void
}

const actionTypes = {
  ADD_NOTIFICATION: "ADD_NOTIFICATION",
  UPDATE_NOTIFICATION: "UPDATE_NOTIFICATION",
  DISMISS_NOTIFICATION: "DISMISS_NOTIFICATION",
  REMOVE_NOTIFICATION: "REMOVE_NOTIFICATION",
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_NOTIFICATION"]
      notification: NotificationToast
    }
  | {
      type: ActionType["UPDATE_NOTIFICATION"]
      notification: Partial<NotificationToast>
    }
  | {
      type: ActionType["DISMISS_NOTIFICATION"]
      notificationId?: NotificationToast["id"]
    }
  | {
      type: ActionType["REMOVE_NOTIFICATION"]
      notificationId?: NotificationToast["id"]
    }

interface State {
  notifications: NotificationToast[]
}

const notificationTimeouts = new Map<string, ReturnType<typeof setTimeout>>()
const autoDismissTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (notificationId: string) => {
  if (notificationTimeouts.has(notificationId)) {
    return
  }

  const timeout = setTimeout(() => {
    notificationTimeouts.delete(notificationId)
    dispatch({
      type: "REMOVE_NOTIFICATION",
      notificationId: notificationId,
    })
  }, NOTIFICATION_REMOVE_DELAY)

  notificationTimeouts.set(notificationId, timeout)
}

const addAutoDismissTimeout = (notificationId: string) => {
  const timeout = setTimeout(() => {
    autoDismissTimeouts.delete(notificationId)
    dispatch({
      type: "DISMISS_NOTIFICATION",
      notificationId: notificationId,
    })
  }, NOTIFICATION_AUTO_DISMISS)

  autoDismissTimeouts.set(notificationId, timeout)
}

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_NOTIFICATION":
      return {
        ...state,
        notifications: [action.notification, ...state.notifications].slice(0, NOTIFICATION_LIMIT),
      }

    case "UPDATE_NOTIFICATION":
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.id === action.notification.id ? { ...n, ...action.notification } : n
        ),
      }

    case "DISMISS_NOTIFICATION": {
      const { notificationId } = action

      if (notificationId) {
        addToRemoveQueue(notificationId)
        // Clear auto-dismiss timeout when manually dismissed
        const autoDismissTimeout = autoDismissTimeouts.get(notificationId)
        if (autoDismissTimeout) {
          clearTimeout(autoDismissTimeout)
          autoDismissTimeouts.delete(notificationId)
        }
      } else {
        state.notifications.forEach((notification) => {
          addToRemoveQueue(notification.id)
          const autoDismissTimeout = autoDismissTimeouts.get(notification.id)
          if (autoDismissTimeout) {
            clearTimeout(autoDismissTimeout)
            autoDismissTimeouts.delete(notification.id)
          }
        })
      }

      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.id === notificationId || notificationId === undefined
            ? {
                ...n,
                open: false,
              }
            : n
        ),
      }
    }
    case "REMOVE_NOTIFICATION":
      if (action.notificationId === undefined) {
        return {
          ...state,
          notifications: [],
        }
      }
      return {
        ...state,
        notifications: state.notifications.filter((n) => n.id !== action.notificationId),
      }
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { notifications: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

type NotificationInput = Omit<NotificationToast, "id" | "open" | "onOpenChange">

function showNotification({ ...props }: NotificationInput) {
  const id = genId()

  const update = (props: NotificationToast) =>
    dispatch({
      type: "UPDATE_NOTIFICATION",
      notification: { ...props, id },
    })
  const dismiss = () => dispatch({ type: "DISMISS_NOTIFICATION", notificationId: id })

  dispatch({
    type: "ADD_NOTIFICATION",
    notification: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })

  // Start auto-dismiss timer
  addAutoDismissTimeout(id)

  return {
    id: id,
    dismiss,
    update,
  }
}

function useNotification() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    showNotification,
    dismiss: (notificationId?: string) => dispatch({ type: "DISMISS_NOTIFICATION", notificationId }),
  }
}

// Helper functions to create specific notification types
export function showProfileViewNotification(
  fromUserName: string, 
  fromUserPhoto?: string, 
  fromUserId?: string, 
  notificationId?: string
) {
  return showNotification({
    type: "profile_view",
    fromUserName,
    fromUserPhoto,
    fromUserId,
    notificationId,
    title: "Profile view",
    description: `${fromUserName} viewed your profile.`,
  })
}

export function showMessageNotification(
  fromUserName: string, 
  fromUserPhoto?: string, 
  fromUserId?: string, 
  notificationId?: string
) {
  return showNotification({
    type: "message_received",
    fromUserName,
    fromUserPhoto,
    fromUserId,
    notificationId,
    title: "New message",
    description: `${fromUserName} sent you a message.`,
  })
}

export { useNotification, showNotification }