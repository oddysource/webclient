
// mozilla chrome compat layer -- very similar to adapter.js
function WebrtcApi() {
    if (navigator.mozGetUserMedia) {
        console.log('This appears to be Firefox');
        if (!MediaStream.prototype.getVideoTracks || !MediaStream.prototype.getAudioTracks)
            throw new Error('webRTC API missing MediaStream.getXXXTracks');

        var version = parseInt(navigator.userAgent.match(/Firefox\/([0-9]+)\./)[1], 10);
        if (version < 22)
            throw new Error('Your version of Firefox is too old, at lest version 22 is required');
        
        this.peerconnection = mozRTCPeerConnection;
        this.browser = 'firefox';
        this.getUserMedia = navigator.mozGetUserMedia.bind(navigator);
        this.attachMediaStream = function (element, stream) {
            element[0].mozSrcObject = stream;
            element[0].play();
        };
        this.pc_constraints = {};
		if (MediaStream.prototype.clone)
            this.cloneMediaStream = function(src, what) {return src.clone(); }
          else
            this.cloneMediaStream = function(src, what) {return src; } //no cloning, just returns original stream
        
        this.RTCSessionDescription = mozRTCSessionDescription;
        this.RTCIceCandidate = mozRTCIceCandidate;
    } else if (navigator.webkitGetUserMedia) {
        console.log('This appears to be Chrome');
        this.peerconnection =  webkitRTCPeerConnection;
        this.browser =  'chrome';
        this.getUserMedia = navigator.webkitGetUserMedia.bind(navigator);
        this.attachMediaStream = function (element, stream) {
            element.attr('src', webkitURL.createObjectURL(stream));
        };
//            pc_constraints: {} // FIVE-182
        if (navigator.userAgent.indexOf('Android') < 0)
            this.pc_constraints = {'optional': [{'DtlsSrtpKeyAgreement': 'true'}]}; // enable dtls support in canary
          else
            this.pc_constraints = {}; // disable DTLS on Android
            
		this.cloneMediaStream = function(src, what) {
            var stream = new webkitMediaStream;
			if (what.audio)
				stream.addTrack(src.getAudioTracks()[0]);
			if (what.video)
				stream.addTrack(src.getVideoTracks()[0]);
			return stream;
		}
        this.RTCSessionDescription = RTCSessionDescription;
        this.RTCIceCandidate = RTCIceCandidate;
        if (!webkitMediaStream.prototype.getVideoTracks) {
            webkitMediaStream.prototype.getVideoTracks = function () {
                return this.videoTracks;
            };
        }
        if (!webkitMediaStream.prototype.getAudioTracks) {
            webkitMediaStream.prototype.getAudioTracks = function () {
                return this.audioTracks;
            };
        }
    } else {
        console.log('Browser does not appear to be WebRTC-capable');
    }
}

WebrtcApi.prototype.createUserMediaConstraints = function(um)
{
    var constraints = {audio: false, video: false};

    if (um.video)
        constraints.video = {mandatory: {}};// same behaviour as true
    
    if (um.audio)
        constraints.audio = {};// same behaviour as true
   
    if (um.screen)
        constraints.video = {
            "mandatory": {
                "chromeMediaSource": "screen"
            }
        };

    if (um.resolution && !constraints.video) 
        constraints.video = {mandatory: {}};// same behaviour as true
    
    // see https://code.google.com/p/chromium/issues/detail?id=143631#c9 for list of supported resolutions
    switch (um.resolution) 
	{
    // 16:9 first
    case '1080':
    case 'fullhd':
        constraints.video.mandatory.minWidth = 1920;
        constraints.video.mandatory.minHeight = 1080;
        constraints.video.mandatory.minAspectRatio = 1.77;
        break;
    case '720':
    case 'hd':
        constraints.video.mandatory.minWidth = 1280;
        constraints.video.mandatory.minHeight = 720;
        constraints.video.mandatory.minAspectRatio = 1.77;
        break;
    case '360':
        constraints.video.mandatory.minWidth = 640;
        constraints.video.mandatory.minHeight = 360;
        constraints.video.mandatory.minAspectRatio = 1.77;
        break;
    case '180':
        constraints.video.mandatory.minWidth = 320;
        constraints.video.mandatory.minHeight = 180;
        constraints.video.mandatory.minAspectRatio = 1.77;
        break;
        // 4:3
    case '960':
        constraints.video.mandatory.minWidth = 960;
        constraints.video.mandatory.minHeight = 720;
        break;
    case '640':
    case 'vga':
        constraints.video.mandatory.minWidth = 640;
        constraints.video.mandatory.minHeight = 480;
        break;
    case '320':
        constraints.video.mandatory.minWidth = 320;
        constraints.video.mandatory.minHeight = 240;
        break;
    default:
        if (navigator.userAgent.indexOf('Android') != -1) 
		{
            constraints.video.mandatory.minWidth = 320;
            constraints.video.mandatory.minHeight = 240;
            constraints.video.mandatory.maxFrameRate = 15;
        }
        break;
    }

    if (um.bandwidth)
	{ // doesn't work currently, see webrtc issue 1846
        if (!constraints.video) constraints.video = {mandatory: {}};//same behaviour as true
        constraints.video.optional = [{bandwidth: um.bandwidth}];
    }
    if (um.fps)
	{ // for some cameras it might be necessary to request 30fps
        // so they choose 30fps mjpg over 10fps yuy2
        if (!constraints.video) constraints.video = {mandatory: {}};// same behaviour as tru;
        constraints.video.mandatory.minFrameRate = fps;
    }
	return constraints;
}

WebrtcApi.prototype.getUserMediaWithConstraintsAndCallback = function(um, self, okCallback, errCallback)
{
	try 
	{
		this.getUserMedia(this.createUserMediaConstraints(um),
			okCallback.bind(self), errCallback.bind(self));
	} catch(e) {
		errCallback.call(self, null, e);
    }
}		

