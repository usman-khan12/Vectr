import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "../services/firebase.js";

function normalizeAddress(address) {
  if (!address) {
    return null;
  }
  return address
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function useNotes(address) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const addressKey = useMemo(() => normalizeAddress(address), [address]);

  useEffect(() => {
    if (!addressKey) {
      setNotes([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const notesRef = collection(db, "notes");
    const q = query(
      notesRef,
      where("addressKey", "==", addressKey),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setNotes(items);
        setLoading(false);
      },
      (err) => {
        console.error("useNotes snapshot error", err);
        setError(err);
        setLoading(false);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [addressKey, refreshToken]);

  const addNote = async (type, content) => {
    if (!address || !addressKey) {
      throw new Error("Address required to add note");
    }
    const docData = {
      address,
      addressKey,
      type: type || "general",
      content,
      createdAt: serverTimestamp(),
      createdBy: "dispatch",
    };
    const notesRef = collection(db, "notes");
    await addDoc(notesRef, docData);
    try {
      fieldUnit.sendNote({
        type: docData.type,
        content: docData.content,
      });
    } catch (error) {
      console.error("useNotes field unit notify error", error);
    }
  };

  const refreshNotes = () => {
    setRefreshToken((value) => value + 1);
  };

  return {
    notes,
    loading,
    error,
    addNote,
    refreshNotes,
  };
}
