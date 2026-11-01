from .config import SCENEDETECT_AVAILABLE, SCENEDETECT_V6, suppress_output

if SCENEDETECT_AVAILABLE:
    from scenedetect import SceneManager
    from scenedetect.detectors import ContentDetector
    if SCENEDETECT_V6:
        from scenedetect import open_video
    else:
        from scenedetect import VideoManager

def detect_cuts(filepath):
    if not SCENEDETECT_AVAILABLE: return [], 0
    cuts = []
    try:
        sm = SceneManager()
        sm.add_detector(ContentDetector(threshold=27.0)) # Чуть понизил порог
        
        if SCENEDETECT_V6:
            video = open_video(filepath)
            sm.detect_scenes(video)
        else:
            with suppress_output():
                vm = VideoManager([filepath])
                vm.set_downscale_factor()
                vm.start()
                sm.detect_scenes(frame_source=vm)
                
        scene_list = sm.get_scene_list()
        cuts = [scene[0].get_seconds() for scene in scene_list]
        return cuts, len(cuts)
    except: return [], 0