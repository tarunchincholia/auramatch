import { useEffect, useRef, useState, useCallback } from "react";
import { socket } from "../lib/socket";

export type WebRTCState = "disconnected" | "waiting" | "matched" | "connecting" | "connected" | "battle" | "result";

export interface BattleTick {
  myScore: number;
  theirScore: number;
  timeLeft: number;
}

export interface BattleResult {
  won: boolean;
  myFinalScore: number;
  theirFinalScore: number;
}

export function useWebRTC() {
  const [state, setState] = useState<WebRTCState>("disconnected");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [twist, setTwist] = useState<string>("");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [battleTick, setBattleTick] = useState<BattleTick>({ myScore: 100, theirScore: 100, timeLeft: 30 });
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const roomIdRef = useRef<string | null>(null);

  const initializeLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      return stream;
    } catch {
      return null;
    }
  }, []);

  const createPeerConnection = useCallback((room: string) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", { roomId: room, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setState("connected");
        // Signal ready to start battle
        setTimeout(() => {
          socket.emit("battle-ready", { roomId: room });
          setState("battle");
        }, 3000); // 3 sec scan overlay then battle starts
      }
    };

    peerConnection.current = pc;
    return pc;
  }, []);

  useEffect(() => {
    socket.on("waiting", () => {
      setState("waiting");
    });

    socket.on("matched", async ({ roomId: room, twist: tw }: { roomId: string; twist: string }) => {
      setState("matched");
      setRoomId(room);
      roomIdRef.current = room;
      setTwist(tw);
      setBattleResult(null);
      setBattleTick({ myScore: 100, theirScore: 100, timeLeft: 30 });
    });

    socket.on("role", async ({ role }: { role: "caller" | "callee" }) => {
      const room = roomIdRef.current;
      if (!room) return;

      const currentStream = await (async () => {
        try {
          return await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        } catch {
          return null;
        }
      })();

      if (currentStream) {
        setLocalStream(currentStream);
      }

      const pc = createPeerConnection(room);

      if (currentStream) {
        currentStream.getTracks().forEach((track) => pc.addTrack(track, currentStream));
      }

      setState("connecting");

      if (role === "caller") {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("offer", { roomId: room, offer });
      }
    });

    socket.on("offer", async ({ offer }: { offer: RTCSessionDescriptionInit }) => {
      const room = roomIdRef.current;
      if (!peerConnection.current || !room) return;
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);
      socket.emit("answer", { roomId: room, answer });
    });

    socket.on("answer", async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
      if (!peerConnection.current) return;
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on("ice-candidate", async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      if (!peerConnection.current) return;
      try {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // ignore
      }
    });

    socket.on("battle-tick", (tick: BattleTick) => {
      setBattleTick(tick);
    });

    socket.on("battle-result", (result: BattleResult) => {
      setBattleResult(result);
      setState("result");
    });

    socket.on("partner-left", () => {
      cleanupConnection();
      setState("disconnected");
    });

    socket.on("skipped", () => {
      cleanupConnection();
      setState("disconnected");
    });

    return () => {
      socket.off("waiting");
      socket.off("matched");
      socket.off("role");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      socket.off("battle-tick");
      socket.off("battle-result");
      socket.off("partner-left");
      socket.off("skipped");
    };
  }, [createPeerConnection]);

  const joinQueue = useCallback(async () => {
    cleanupConnection();
    setBattleResult(null);
    setBattleTick({ myScore: 100, theirScore: 100, timeLeft: 30 });
    setState("connecting");
    socket.emit("join-queue");
  }, []);

  const skip = useCallback(() => {
    socket.emit("skip");
    cleanupConnection();
    setState("disconnected");
  }, []);

  const cleanupConnection = useCallback(() => {
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    setRemoteStream(null);
    setRoomId(null);
    roomIdRef.current = null;
  }, []);

  const disconnect = useCallback(() => {
    socket.emit("skip");
    cleanupConnection();
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    setState("disconnected");
  }, [cleanupConnection, localStream]);

  return {
    state,
    localStream,
    remoteStream,
    twist,
    roomId,
    battleTick,
    battleResult,
    joinQueue,
    skip,
    disconnect,
  };
}
