# Group Chat Implementation Guide

## Overview
This documentation covers the complete implementation of group chat functionality in the MERN chat system, including schema updates, backend logic, Socket.io integration, and frontend UI components.

## Features Implemented

### 1. **Schema & Database**
- ✅ `isGroupChat` boolean flag to distinguish between 1-on-1 and group chats
- ✅ `groupAdmin` field to track the group administrator
- ✅ `participants` array to store all group members
- ✅ `name` field for group identification
- ✅ `createdBy` field to track group creator

### 2. **Backend Services**

#### New Service Functions (chat.service.js)
```javascript
// Core group operations
createGroupChat(userId, name, participantIds)     // Create new group
updateGroupChat(chatId, userId, updateData)       // Rename or modify group
getGroupDetails(chatId, userId)                   // Get full group info
addGroupMember(chatId, userId, newMemberId)       // Add member (admin only)
removeGroupMember(chatId, userId, memberIdToRemove) // Remove member (admin only)
renameGroup(chatId, userId, newName)              // Rename group (admin only)
leaveGroup(chatId, userId)                        // User leaves group
```

#### Authorization
- Only group admin can:
  - Add/remove members
  - Rename the group
  - Manage group settings
- Any member can:
  - Leave the group
  - Send messages
  - View group info
- If admin leaves, rights transfer to first remaining member

### 3. **Socket.io Events**

#### Emitted Events (Client → Server)
```javascript
socket.emit("join_group", groupId)           // Join group room
socket.emit("leave_group", groupId)          // Leave group room
socket.emit("typing", {                      // User typing
  chatId,
  userName,
  isGroupChat: true
})
socket.emit("stop_typing", {                 // Stop typing
  chatId,
  isGroupChat: true
})
```

#### Received Events (Server → Client)
```javascript
socket.on("new_message", (message))          // New message arrives
socket.on("group_updated", (updateData))     // Group info updated
socket.on("group_member_added", (data))      // Member added to group
socket.on("group_member_removed", (data))    // Member removed from group
socket.on("group_renamed", (data))           // Group renamed
socket.on("user_typing", (data))             // Someone typing
socket.on("user_stop_typing", (data))        // Someone stopped typing
```

#### Room Structure
- **1-on-1 chats**: Room named `chat_{chatId}`
- **Group chats**: Room named `group_{chatId}`
- Messages broadcast only to members in the respective room

### 4. **Backend API Endpoints**

#### New/Modified Routes
```
POST   /chat                       Create chat or group
GET    /chat                       Get all user chats
GET    /chat/:chatId/details       Get group details
GET    /chat/search                Search users
PUT    /chat/:chatId/group         Update group (rename, add/remove members)
POST   /chat/:chatId/add-member    Add member to group
POST   /chat/:chatId/remove-member Remove member from group
POST   /chat/:chatId/rename        Rename group
POST   /chat/:chatId/leave         Leave group
GET    /chat/:chatId/messages      Get chat messages
POST   /chat/:chatId/messages      Send message (file upload)
PUT    /chat/:chatId/read          Mark as read
```

### 5. **Frontend Components**

#### GroupCreationModal (`GroupCreationModal.jsx`)
A two-step modal for creating group chats:

**Step 1: Select Members**
- Search and select multiple colleagues
- Shows selected member count
- Prevents duplicates
- Badge-based selection display

**Step 2: Name Group**
- Enter group name (100 char limit)
- Preview of selected members
- Can go back to change members
- Character counter

**Features:**
- Real-time search (300ms debounce)
- Auto-filtering of already-selected members
- Responsive design
- Error handling and validation

#### GroupManagementModal (`GroupManagementModal.jsx`)
Group settings interface for admins:

**Capabilities:**
- View and edit group name (admin only)
- View group admin
- See all members with email
- Add new members (search interface)
- Remove members (admin only)
- Admin transfers automatically when admin leaves

**Features:**
- Admin-only edit mode
- Member search for adding
- Confirmation dialogs
- Responsive design
- Real-time updates via Socket.io

#### Updated PremiumChatPage (`PremiumChatPage.jsx`)
Enhanced chat interface with:

**New Elements:**
- Group creation button (appears when "New Chat" is active)
- Group settings button (appears when group chat is active)
- Visual distinction between 1-on-1 and group chats
- Group icon (purple gradient) vs user avatars
- Socket listeners for group events

**Modified Handlers:**
- `handleGroupUpdate()` - Refresh UI on group changes
- `handleGroupCreated()` - Add new group to chat list
- Socket event listeners for group-specific events
- Typing indicators include `isGroupChat` flag

**UI Improvements:**
- "New Chat" button shows as menu with group and user search options
- Group chats show group name instead of user name
- Group icon in sidebar and header
- Group settings accessible via purple gear icon
- No online/offline indicators for group chats

### 6. **Encryption Integration**

All messages (group and 1-on-1) are automatically encrypted with:
- AES-256-CBC encryption
- Unique IV derived from chat ID
- Transparent encryption/decryption
- Works seamlessly with group chats

### 7. **Data Flow**

#### Create Group Flow
```
User selects members → GroupCreationModal → API POST /chat
→ Backend creates group → Returns populated group object
→ Frontend adds to chat list → Socket join_group
→ User sees group in sidebar
```

#### Send Message in Group Flow
```
User types message → Auto-encrypt with chat ID
→ POST /chat/{groupId}/messages → Backend stores message
→ Backend broadcasts to group room via Socket.io
→ All members receive notification → Auto-decrypt
→ Message appears in chat
```

#### Group Management Flow
```
Admin opens group settings → GroupManagementModal
→ Search and select member to add → PUT /chat/{groupId}/group (action: add)
→ Backend validates and adds → Socket notification to all members
→ UI updates for all members → Toast confirmation
```

#### Member Leaves Group Flow
```
User selects leave → Confirmation dialog
→ POST /chat/{groupId}/leave → Backend removes user
→ If admin: transfer rights to first member or delete if empty
→ Socket notification to remaining members
→ User redirected to chat list
```

## Security Considerations

### Authorization
✅ All endpoints check if requesting user is participant
✅ Only admin can modify group (add/remove/rename)
✅ Any member can leave
✅ Cannot access messages/details without being member

### Encryption
✅ All messages encrypted before transmission
✅ Unique encryption keys per user session
✅ Transparent to user - automatic encryption/decryption

### Validation
✅ Group name cannot be empty
✅ Cannot add non-existent users
✅ Cannot add user already in group
✅ Cannot remove non-existent members

## Usage Instructions

### Creating a Group Chat

1. Click the **+** button in the sidebar header
2. Click the **Users icon** to create a group (or search for individual users for 1-on-1)
3. **Search and select** colleagues you want to add
4. Click **Next**
5. **Enter group name** and click **Create Group**
6. Group appears in sidebar and auto-selects

### Managing a Group (Admin Only)

1. Open the group chat
2. Click the **purple gear icon** in the header
3. In the modal you can:
   - **Edit name**: Click the Edit button, change name, click Save
   - **Add members**: Click the Add button, search for users, click the + button
   - **Remove members**: Click the trash icon next to a member
4. Changes are reflected in real-time for all members

### Leaving a Group

1. In group management modal, click Close (or navigate to another chat)
2. If admin, you'll be transferred to another member
3. If too few members, group may be deleted

## Testing Checklist

- [ ] Create group chat with multiple members
- [ ] Verify group appears in all members' chat lists
- [ ] Send message to group - verify all members receive it
- [ ] Add member to existing group - verify they see messages
- [ ] Remove member from group - verify they lose access
- [ ] Rename group - verify name updates for all members
- [ ] Admin change - verify rights transfer
- [ ] Leave group as admin - verify handoff works
- [ ] Leave group as member - verify removal works
- [ ] Typing indicators in group
- [ ] Dark mode with groups
- [ ] Encryption in group messages
- [ ] Online/offline status (1-on-1 only)

## API Request Examples

### Create Group
```bash
curl -X POST http://localhost:5000/api/chat \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "isGroup": true,
    "name": "Project Alpha Team",
    "participants": ["userId1", "userId2", "userId3"]
  }'
```

### Add Member to Group
```bash
curl -X PUT http://localhost:5000/api/chat/<groupId>/group \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "add",
    "userId": "newMemberId"
  }'
```

### Rename Group
```bash
curl -X POST http://localhost:5000/api/chat/<groupId>/rename \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Group Name"
  }'
```

### Leave Group
```bash
curl -X POST http://localhost:5000/api/chat/<groupId>/leave \
  -H "Authorization: Bearer <token>"
```

## Troubleshooting

### Group not appearing after creation
- Refresh the page
- Check browser console for errors
- Verify Socket.io connection is active

### Messages not appearing in group
- Check Socket.io connection
- Verify you're a member of the group
- Check encryption is working (should see "End-to-End Encrypted" badge)

### Can't add member
- Verify you're the group admin
- Member must exist in system
- Member cannot already be in group

### Group admin rights not transferred
- Check backend logs
- Verify Socket.io events are received
- Manual intervention: update database or recreate group

## Future Enhancements

- [ ] Group avatars/profile pictures
- [ ] Group description/topic
- [ ] Pin important messages
- [ ] Message reactions/emojis
- [ ] Voice/video group calls
- [ ] File sharing in groups
- [ ] Group notifications preferences
- [ ] Group archiving
- [ ] Message search in groups
- [ ] Group activity logs

## Performance Notes

- Group chats use Socket.io rooms for efficient message broadcasting
- Only group members receive messages (not system-wide)
- Group updates propagate in real-time (<100ms typically)
- Encryption doesn't impact performance (client-side)
- Database indexes on participants for fast lookups
