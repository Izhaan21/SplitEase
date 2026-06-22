import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc, getDoc, setDoc, collection,
  serverTimestamp, Timestamp
} from "firebase/firestore";

/* ============================================================
   join.js — SplitEase
   Handles: reading invite code from URL, showing group info,
            sending join request, status polling
   ============================================================ */

function toTitleCase(str) {
  return String(str).trim().replace(/\b\w/g, c => c.toUpperCase());
}

function show(id)  { const el = document.getElementById(id); if (el) el.style.display = ''; }
function hide(id)  { const el = document.getElementById(id); if (el) el.style.display = 'none'; }

let INVITE_DATA  = null;
let CURRENT_USER = null;
let CURRENT_UID  = null;

async function init() {
  const params   = new URLSearchParams(window.location.search);
  const code     = params.get('code');

  if (!code) {
    hide('join-loading');
    show('join-error');
    return;
  }

  // Load invite from Firestore
  try {
    const inviteSnap = await getDoc(doc(db, 'invites', code));
    if (!inviteSnap.exists()) {
      hide('join-loading');
      show('join-error');
      return;
    }

    INVITE_DATA = inviteSnap.data();

    // Check expiry
    if (INVITE_DATA.expiresAt && INVITE_DATA.expiresAt.toDate() < new Date()) {
      hide('join-loading');
      show('join-error');
      return;
    }

    // Populate UI
    document.getElementById('invite-creator').textContent   = INVITE_DATA.createdBy;
    document.getElementById('invite-group-name').textContent = INVITE_DATA.groupName;
    document.getElementById('invite-meta').textContent =
      `Expires ${INVITE_DATA.expiresAt.toDate().toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}`;

    hide('join-loading');
    show('join-info');

    // Now wait for auth
    onAuthStateChanged(auth, user => handleAuthState(user));

  } catch (err) {
    console.error('Error loading invite:', err);
    hide('join-loading');
    show('join-error');
  }
}

async function handleAuthState(user) {
  if (!user) {
    show('join-auth-needed');
    return;
  }

  CURRENT_UID  = user.uid;
  CURRENT_USER = toTitleCase(user.displayName || user.email.split('@')[0]);

  // Check if already a member
  const groupSnap = await getDoc(doc(db, 'groups', INVITE_DATA.groupId));
  if (!groupSnap.exists()) {
    show('join-error');
    hide('join-info');
    return;
  }

  const groupData = groupSnap.data();
  const members   = (groupData.members || []).map(m => m.toLowerCase());

  if (members.includes(CURRENT_USER.toLowerCase())) {
    show('join-already-member');
    return;
  }

  // Check if request already exists
  const reqSnap = await getDoc(doc(db, 'groups', INVITE_DATA.groupId, 'requests', CURRENT_UID));
  if (reqSnap.exists()) {
    const status = reqSnap.data().status;
    if (status === 'pending')  { show('join-pending');  return; }
    if (status === 'accepted') { show('join-accepted'); return; }
  }

  // Show request button
  show('join-request-area');
}

window.sendJoinRequest = async function () {
  const btn = document.getElementById('join-request-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

  try {
    await setDoc(doc(db, 'groups', INVITE_DATA.groupId, 'requests', CURRENT_UID), {
      uid:          CURRENT_UID,
      displayName:  CURRENT_USER,
      email:        auth.currentUser.email,
      status:       'pending',
      requestedAt:  serverTimestamp(),
      inviteCode:   new URLSearchParams(window.location.search).get('code'),
    });

    hide('join-request-area');
    show('join-pending');
  } catch (err) {
    console.error('Error sending request:', err);
    if (btn) { btn.disabled = false; btn.textContent = 'Request to Join'; }
    alert('Failed to send request. Please try again.');
  }
};

document.addEventListener('DOMContentLoaded', init);
