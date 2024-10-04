//const { text } = require("express");

//const { default: test } = require("node:test");



//const { use } = require("vue/types/umd");

//const { Socket } = require("socket.io");


const socket = io('http://localhost:4004');  // Use without explicitly forcing transport


// add second video things in here somewhere.
const videoGrid = document.getElementById('video-grid');
const selfVidGrid = document.getElementById('self-video-grid');


const myVideo1 = document.createElement('video');
const myVideo2 = document.createElement('video');


myVideo1.muted = true;
myVideo2.muted = true;


var localUserOrder = [];
var rotatedOrder = [];
var peer = new Peer({
    iceServers: [
        {
          urls: "stun:stun.relay.metered.ca:80",
        },
        {
          urls: "turn:global.relay.metered.ca:80",
          username: "7441ca2e7cc0f1b0ffbdc41f",
          credential: "SOTwjWXK9OdAQkgS",
        },
        {
          urls: "turn:global.relay.metered.ca:80?transport=tcp",
          username: "7441ca2e7cc0f1b0ffbdc41f",
          credential: "SOTwjWXK9OdAQkgS",
        },
        {
          urls: "turn:global.relay.metered.ca:443",
          username: "7441ca2e7cc0f1b0ffbdc41f",
          credential: "SOTwjWXK9OdAQkgS",
        },
        {
          urls: "turns:global.relay.metered.ca:443?transport=tcp",
          username: "7441ca2e7cc0f1b0ffbdc41f",
          credential: "SOTwjWXK9OdAQkgS",
        },
    ],
  });

let connectedNum = false;

let thisNum = 0;

let myVideoStream; // This is the left stream
let myVideoStream2; // This is the right stream

// New block of code, enumerates both cameras and adds them to the self-vid grid
navigator.mediaDevices.enumerateDevices().then((devices) => {
    devices.forEach(device => {
        console.log(device.kind + ": " + device.label + " id = " + device.deviceId);
    });
    
    const videoDevices = devices.filter((device) => device.kind === 'videoinput');
    if (videoDevices.length >= 2) {
        navigator.mediaDevices.getUserMedia({
            video: { deviceId: videoDevices[0].deviceId },
            audio: {
                echoCancellation: true, // Enables echo cancellation
                noiseSuppression: true, // Reduces background noise
                autoGainControl: true   // Adjusts the microphone sensitivity
            },
        }).then((stream1) => {
            
            myVideo1.srcObject = stream1;
            myVideoStream = stream1;
            myVideo1.muted = true; // Mute local video
            myVideo1.play();
            addSelfVideoStream(myVideo1, stream1, peer.id);
        
        });
        navigator.mediaDevices.getUserMedia({
            video: { deviceId: videoDevices[1].deviceId },
            audio: {
                echoCancellation: true, // Enables echo cancellation
                noiseSuppression: true, // Reduces background noise
                autoGainControl: true   // Adjusts the microphone sensitivity
            },
        }).then((stream2) => {
            myVideo2.srcObject = stream2;
            myVideoStream2 = stream2;
            myVideo2.muted = true; // Mute the local video to prevent hearing yourself
            myVideo2.play();
            addSelfVideoStream(myVideo2, stream2, peer.id);
       

        });
    } else {
        //Functionality for only having one camera
        navigator.mediaDevices.getUserMedia({
            video: { deviceId: videoDevices[0].deviceId },
            audio: {
                echoCancellation: true, // Enables echo cancellation
                noiseSuppression: true, // Reduces background noise
                autoGainControl: true   // Adjusts the microphone sensitivity
            },
        }).then((stream1) => {
            myVideo1.srcObject = stream1;
            myVideoStream = stream1;
            myVideo1.muted = true; // Mute the local video to prevent hearing yourself
            myVideo1.play();
            addSelfVideoStream(myVideo1, stream1, peer.id);
 
 

        });
        navigator.mediaDevices.getUserMedia({
            video: { deviceId: videoDevices[0].deviceId },
            audio: {
                echoCancellation: true, // Enables echo cancellation
                noiseSuppression: true, // Reduces background noise
                autoGainControl: true   // Adjusts the microphone sensitivity
            },
        }).then((stream2) => {
            myVideo2.srcObject = stream2;
            myVideoStream2 = stream2;
            myVideo2.muted = true; // Mute the local video to prevent hearing yourself
            myVideo2.play();
            addSelfVideoStream(myVideo2, stream2, peer.id);
       
                    });
    }
});

navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then(stream => {
    //myVideoStream = stream;


    // addSelfVideoStream(myVideo, stream, peer.id);
    console.log("This is the first addVideoStream, " + peer.id);


    // On being called, we answer their call, and add THEIR videostream
    peer.on('call', call => {
        const callerPeerId = call.peer;
        const right = call.metadata.right;
        call.answer(stream)
        const video = document.createElement('video')
        call.on('stream', userVideoStream => {
            //addVideoStream(video, userVideoStream, peer.id)
            addVideoStream(video, userVideoStream, callerPeerId, right)

        })
    });


    socket.on('user-connected', (userId, userOrder, ready) => {
        localUserOrder = userOrder;
        const thisIndex = userOrder.indexOf(peer.id);
        thisNum = thisIndex;
        const peerIndex = userOrder.indexOf(userId);

        if (userOrder.length == 2) {
            if (thisIndex == 0) {
                connectToNewUser(userOrder[1], myVideoStream, userOrder);
            }
            socket.emit('meeting-ready');

        }

        if (userOrder.length == 3 && ready == false) {

            socket.emit('meeting-ready');

            if (thisIndex == 0) {
                connectToNewUser(userOrder[2], myVideoStream2, userOrder);
            }

            if (thisIndex == 1) {
                connectToNewUser(userOrder[2], myVideoStream, userOrder);
            }

        }

    });

    socket.on('add-videos-full', (userId, userOrder) => {
        const thisIndex = userOrder.indexOf(peer.id);
        thisNum = thisIndex;
        const peerIndex = userOrder.indexOf(userId);

        if (userOrder.length == 2) {
            if (thisIndex == 1) {
                connectToNewUser(userOrder[0], myVideoStream2, userOrder);
            }
        } else {
            if (thisIndex == 2) {
                connectToNewUser(userOrder[0], myVideoStream, userOrder);
                connectToNewUser(userOrder[1], myVideoStream2, userOrder);
            }
        }

        rearrangeVideoGrid();

    });


    socket.on('clear-screen', () => {
        removeVideoStream();
        removeAudio();

    });


    let text = $('input');


    $('html').keydown((e) => {
        if (e.which == 13 && text.val().length !== 0) {
            socket.emit('message', text.val(), peer.id.slice(0, 8));
            text.val('');
        }
    })


    socket.on('createMessage', (message, userId) => {
        console.log(userId + " [" + localUserOrder + "]");
        $('.messages').append(`<li class="message"><b>${userId}</b><br/>${message}</li>`);
        scrollToBottom();
    })


    //Add a socket.on here for updateUsers, or tack onto user-connected, that updates the local order of users. Also, make one for disconnections that pulls videos
})

peer.on('open', id => {
    socket.emit('join-room', 1, id);
})

socket.on('redirectHome', () => {
    // Redirect to the home page
    window.location.href = "/"; // Adjust the URL to your home page URL
});

socket.on('leaveMeetingAllocation', (toRemove) => {
    //window.location.href = "/";
    if (thisNum !== toRemove) {
        window.location.href = "/";
        window.location.href = "/ians-special-testing-room";
    } else {
        window.location.href = "/";
    }

});


const connectToNewUser = (userId, stream, userOrder) => {
    let right = false;
    if (stream == myVideoStream2) {
        right = true;
    }
    
    const call = peer.call(userId, stream, { metadata: { right: right }}); // Calls the specified new user (from Id), feeding them the video (this is likeley the point where multi-cam is going to be important)
    const video = document.createElement('video'); // Creates a new video element for the new user
    
    localUserOrder = userOrder;
    rotatedOrder = rotateArrayToCenter(localUserOrder);

    // Creates a new video element clientside from the new user's stream
    //addVideoStream(video, stream, peer.id)
}


const removeVideoStream = () => {
    const videoContainers = document.querySelectorAll('.video-container');
    videoContainers.forEach(container => {
        container.remove();
    });

}

const removeAudio = () => {
    const videoContainers = document.querySelectorAll('.video-container');
    videoContainers.forEach(container => {
        const video = container.querySelector('video');
        const audioTracks = video.srcObject.getAudioTracks();
        audioTracks.forEach(track => track.stop());
    });
}



const addVideoStream = (video, stream, label, right) => {
    // Set up audio panning
    const audioContext = new AudioContext();

    const copiedStream = new MediaStream();
// Copy audio tracks
const audioTracks = stream.getAudioTracks();
audioTracks.forEach(track => {
    copiedStream.addTrack(track); // Add each audio track to the new stream
});

// Copy video tracks
const videoTracks = stream.getVideoTracks();
videoTracks.forEach(track => {
    copiedStream.addTrack(track); // Add each video track to the new stream
});

    // Create a MediaStreamSource from the incoming stream
    const source = audioContext.createMediaStreamSource(copiedStream);

    // Create a StereoPannerNode and MediaStreamDestination
    const panner = audioContext.createStereoPanner();
    const destination = audioContext.createMediaStreamDestination();

    // Set the panning value (-1 for left, 1 for right)
    if (right) {
        panner.pan.value = -1;
    } else {
        panner.pan.value = 1;
    }

    // Connect the audio nodes
    source.connect(panner);
    panner.connect(destination);

    source.connect(panner).connect(audioContext.destination);

    // Create a new MediaStream with the panned audio track
    let audioTrack = stream.getAudioTracks();
    //stream.removeTrack(audioTrack[0]);
    // Create a new MediaStream with the panned audio track

    // You can now use combinedStream as needed, e.g., setting it to a video element
    video.srcObject = stream;
    
    video.srcObject = stream;
    console.log("Stream ID is " + stream.id + " vs. the label, which is " + label)
    video.addEventListener('loadedmetadata', () => {
        video.play();
    })


    console.log("The label is " + label);


    const videoContainer = document.createElement('div');
    videoContainer.classList.add('video-container');


    const videoLabel = document.createElement('p');
    videoLabel.classList.add('video-label');
    if (right) {
        videoLabel.innerText = label + "right";
    } else {
        videoLabel.innerText = label + "left";
    }


    videoContainer.appendChild(video);
    videoContainer.appendChild(videoLabel);


    videoGrid.append(videoContainer);

    rearrangeVideoGrid();
}


// Yes, this is incredibly ugly, but also I want to finish this faster rather than slower, so suck it up
const addSelfVideoStream = (video, stream, label) => {
    video.srcObject = stream;
    console.log("Stream ID is " + stream.id + " vs. the label, which is " + label)
    video.addEventListener('loadedmetadata', () => {
        video.play();
    })


    console.log("The label is " + label);


    const videoContainer = document.createElement('div');
    videoContainer.classList.add('video-container');


    const videoLabel = document.createElement('p');
    videoLabel.classList.add('video-label');
    videoLabel.innerText = label;


    videoContainer.appendChild(video);
    videoContainer.appendChild(videoLabel);


    selfVidGrid.append(videoContainer);
}


const rearrangeVideoGrid = () => {
    const thisIndex = localUserOrder.indexOf(peer.id);

    const videoContainers = Array.from(document.querySelectorAll('.video-container')); // Convert NodeList to Array

    // Separate video containers based on whether they contain 'left' or 'right' in their inner text
    const leftContainers = [];
    const rightContainers = [];

    videoContainers.forEach(videoContainer => {
        const labelText = videoContainer.querySelector('.video-label').innerText;

        if (labelText.includes('left')) {
            leftContainers.push(videoContainer);
        } else if (labelText.includes('right')) {
            rightContainers.push(videoContainer);
        }
    });

    // Remove existing video containers from the grid
    while (videoGrid.firstChild) {
        videoGrid.firstChild.remove();
    }

    // Append left containers first, then right containers
    leftContainers.forEach(container => videoGrid.appendChild(container));
    rightContainers.forEach(container => videoGrid.appendChild(container));
};



const scrollToBottom = () => {
    let d = $('.main__chat_window');
    d.scrollTop(d.prop("scrollHeight"));
}


const muteUnmute = () => {
    const enabled = myVideoStream.getAudioTracks()[0].enabled;
    if (enabled) {
        myVideoStream.getAudioTracks()[0].enabled = false;
        myVideoStream2.getAudioTracks()[0].enabled = false;
        setUnmuteButton();
    } else {
        setMuteButton();
        myVideoStream.getAudioTracks()[0].enabled = true;
        myVideoStream2.getAudioTracks()[0].enabled = true;
    }
}

const leaveMeeting = () => {

    socket.emit('leave-meeting', thisNum);

}




const setMuteButton = () => {
    const html = `
   <i class="fas fa-microphone-lines"></i>
       <span>Mute</span>
   `


    document.querySelector('.main__mute_button').innerHTML = html;
}


const setUnmuteButton = () => {
    const html = `
   <i class="unmute fas fa-microphone-lines-slash"></i>
       <span>Unmute</span>
   `


    document.querySelector('.main__mute_button').innerHTML = html;
}


const playStop = () => {
    let enabled = myVideoStream.getVideoTracks()[0].enabled;
    if (enabled) {
        myVideoStream.getVideoTracks()[0].enabled = false;
        myVideoStream2.getVideoTracks()[0].enabled = false;
        setPlayVideo();
    } else {
        setStopVideo();
        myVideoStream.getVideoTracks()[0].enabled = true;
        myVideoStream2.getVideoTracks()[0].enabled = true;
    }
}


const setPlayVideo = () => {
    const html = `
   <i class="stop fas fa-video-slash"></i>
       <span>Play Video</span>
   `
    document.querySelector('.main__video_button').innerHTML = html;
}


const setStopVideo = () => {
    const html = `
   <i class="fas fa-video"></i>
       <span>Stop Video</span>
   `
    document.querySelector('.main__video_button').innerHTML = html;
}


const rotateArrayToCenter = (arrOrig, element) => {
    var arr = [...arrOrig];
    var index = arr.indexOf(element);
    if (index === -1) {
        // Element not found in the array, return the original array.
        return arr;
    }
    const centerIndex = Math.floor(arr.length / 2);
    let rotations = 0;
    while (index !== centerIndex) {
        arr.unshift(arr.pop());
        rotations++;
        if (rotations > arr.length) {
            // Element cannot be moved to the center, return the original array.
            return arr;
        }
        index = arr.indexOf(element);
    }
    return arr;
}






// Function to reconnect to all current users and update their streams
const reconnectUsers = () => {
    const currentUsers = Array.from(videoGrid.getElementsByClassName('video-container'));


    // Remove existing video containers from the grid
    while (videoGrid.firstChild) {
        videoGrid.firstChild.remove();
    }


    currentUsers.forEach(videoContainer => {
        const userId = videoContainer.querySelector('.video-label').innerText;
        var localOrderMinusSelf = [...localUserOrder];
        const localIndex = localUserOrder.indexOf(peer.id);
        localOrderMinusSelf.splice(localIndex, 1);
        const userIndex = localOrderMinusSelf.indexOf(userId);


        console.log("\nTHE RECONNECTION NEW USER IS " + userId + " WITHIN THE MINUS ORDER OF " + localOrderMinusSelf + "\n");


        let selectedStream;
        if (userIndex < (localOrderMinusSelf.length / 2)) {
            selectedStream = myVideoStream;
        } else {
            selectedStream = myVideoStream2;
        }

        const call = peer.call(userId, selectedStream);

        call.on('stream', userVideoStream => {
            const userVideo = videoContainer.querySelector('video');
            userVideo.srcObject = userVideoStream;
            userVideo.play();
        });
    });
    console.log("THe current user list is " + Array.from(videoGrid.getElementsByClassName('video-label')).map(label => label.innerText));
};

// Call the reconnectUsers function whenever you need to update streams
// For example, you can call it when the settings are changed or when a user joins the call
// You can also add a button or an event listener to trigger this function

const settingsButton = document.querySelector('.main__controls__button.main__settings_button');
settingsButton.addEventListener('click', openSettingsModal);


// Function to open the settings modal
function openSettingsModal() {
    // Show the modal (you need to define the modal in your HTML)
    // For example, if you have a modal with id "settingsModal":
    document.getElementById('settingsModal').style.display = 'block';


    // // Populate the modal with camera options
    // populateCameraOptions();
}


// Function to populate the modal with camera options
function populateCameraOptions() {
    // Get a reference to the modal content
    const modalContent = document.querySelector('.modal-content');


    // Enumerate the available camera devices
    navigator.mediaDevices.enumerateDevices().then(devices => {
        const videoDevices = devices.filter(device => device.kind === 'videoinput');

        // Clear previous options
        modalContent.innerHTML = '';


        // Create and append camera options
        videoDevices.forEach(device => {
            const option = document.createElement('div');
            option.classList.add('camera-option');
            option.textContent = device.label;


            // Add click event listener to set selected camera
            option.addEventListener('click', () => setCamera(device.deviceId));


            modalContent.appendChild(option);
        });
    });
}


// Function to set the camera based on the selected device
function setCamera(deviceId) {
    // Close the modal
    document.getElementById('settingsModal').style.display = 'none';


    // Stop current streams
    if (myVideoStream) {
        myVideoStream.getTracks().forEach(track => track.stop());
    }
    if (myVideoStream2) {
        myVideoStream2.getTracks().forEach(track => track.stop());
    }


    // Create new streams with selected devices
    navigator.mediaDevices.getUserMedia({
        video: { deviceId: deviceId },
        audio: false,
    }).then(stream1 => {
        myVideoStream = stream1;
        myVideo1.srcObject = stream1;
        myVideo1.play();
    });
    


    const selectedDeviceIndex = Array.from(document.querySelectorAll('.camera-option'))
        .findIndex(option => option.textContent === deviceId);


    const oppositeDeviceIndex = (selectedDeviceIndex + 1) % 2;

    navigator.mediaDevices.getUserMedia({
        video: { deviceId: deviceId },
        audio: false,
    }).then(stream2 => {
        myVideoStream2 = stream2;
        myVideo2.srcObject = stream2;
        myVideo2.play();
    });
}