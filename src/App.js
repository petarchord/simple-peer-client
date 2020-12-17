import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";
import styles from "./App.module.css";

function App() {
  const [yourID, setYourID] = useState("");
  const [users, setUsers] = useState({});
  const [stream, setStream] = useState();
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerSignal, setCallerSignal] = useState();
  const [callAccepted, setCallAccepted] = useState(false);
  const [userToCall, setUserToCall] = useState("");

  const userVideo = useRef();
  const partnerVideo = useRef();
  const socket = useRef();
  const incomingCall = useRef();

  useEffect(() => {
    socket.current = io.connect("http://127.0.0.1:8000/");
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setStream(stream);
        if (userVideo.current) {
          userVideo.current.srcObject = stream;
        }
      });

    socket.current.on("yourID", (id) => {
      console.log("My id is:", id);
      setYourID(id);
    });

    socket.current.on("allUsers", (users) => {
      console.log("All users:", users);
      setUsers(users);
    });

    socket.current.on("hey", (data) => {
      setReceivingCall(true);
      setCaller(data.from);
      setCallerSignal(data.signal);
      incomingCall.current.style.display = "block";
    });
  }, []);

  function callPeer(id) {
    setUserToCall(id);
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream,
    });

    peer.on("signal", (data) => {
      socket.current.emit("callUser", {
        userToCall: id,
        signalData: data,
        from: yourID,
      });
    });
    //establishing handshake , caller sends the signal to the calling node

    peer.on("stream", (stream) => {
      if (partnerVideo.current) {
        partnerVideo.current.srcObject = stream;
      }
    });

    peer.on("close", () => {
      console.log("The peer one connection has closed...");
      //wrtie code for closing connection

      peer.destroy((err) => {
        console.log("error occurred while destroying the peer connection", err);
      });
      //  peer.removeStream(stream);
    });

    peer.on("error", (err) => {
      console.log("peer one error:", err);
    });

    socket.current.on("callAccepted", (signal) => {
      setCallAccepted(true);
      peer.signal(signal);
    });

    //caller completes the handshake procedure by accepting the signal from the calling node
  }

  function acceptCall() {
    incomingCall.current.style.display = "none";
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream,
    });

    peer.on("signal", (data) => {
      socket.current.emit("acceptCall", { signal: data, to: caller });
    });

    peer.on("stream", (stream) => {
      partnerVideo.current.srcObject = stream;
    });

    peer.on("close", () => {
      console.log("The peer two connection has closed...");
      peer.destroy((err) => {
        console.log("error occurred while destroying the peer connection", err);
      });
      //  peer.removeStream(stream);
    });

    peer.on("error", (err) => {
      console.log("Peer two error:", err);
    });

    peer.signal(callerSignal);
  }

  return (
    <div className={styles.container}>
      <h1>Welcome to Video Chat App</h1>
      <div className={styles.players_holder}>
        <div className={styles.player_item}>
          <h3>{yourID}</h3>
          <video playsInline muted ref={userVideo} autoPlay />
        </div>
        <div className={styles.player_item}>
          <h3>{caller ? caller : userToCall} </h3>
          <video playsInline ref={partnerVideo} autoPlay />
        </div>
      </div>
      <div className={styles.peers_holder}>
        <h3>Your peers:</h3>
        <div className={styles.btn_peers_holder}>
          {Object.keys(users).map((key) => {
            if (key === yourID) {
              return null;
            }

            return (
              <button
                key={key}
                onClick={() => {
                  callPeer(key);
                }}
              >
                Call {key}
              </button>
            );
          })}
        </div>
      </div>
      <div ref={incomingCall} className={styles.incoming_call}>
        <h3>{caller} is calling you...</h3>
        <button onClick={acceptCall}>Accept call</button>
        <button>Cancel</button>
      </div>
    </div>
  );
}

export default App;
