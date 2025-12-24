import Image from "next/image";
import { Post } from "./types";
import { isIOS } from "./utils";

interface MediaRendererProps {
  post: Post;
}

export const MediaRenderer = ({ post }: MediaRendererProps) => {
  const isExternalUrl = (url: string) =>
    url.startsWith("http://") || url.startsWith("https://");

  if (isIOS()) {
    if (post.video) {
      const thumbnailUrl =
        post.videoThumbnail || "/placeholder.svg?height=240&width=400";
      const isExternalThumbnail = isExternalUrl(thumbnailUrl);

      if (isExternalThumbnail) {
        return (
          <div className="mb-4 mt-2 rounded-lg overflow-hidden">
            <img
              src={thumbnailUrl}
              alt="Video Poster"
              width={500}
              height={240}
              className="object-cover rounded-lg border border-gray-800 w-full h-auto"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.src = "/placeholder.svg";
              }}
            />
          </div>
        );
      } else {
        return (
          <div className="mb-4 mt-2 rounded-lg overflow-hidden">
            <Image
              src={thumbnailUrl}
              alt="Video Poster"
              width={500}
              height={240}
              className="object-cover rounded-lg border border-gray-800"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.src = "/placeholder.svg";
              }}
              priority={false}
              loading="lazy"
              unoptimized={true}
            />
          </div>
        );
      }
    }
  }

  if (post.video) {
    // Use proxy for Twitter videos to bypass tracking protection
    const getVideoUrl = (url: string): string => {
      if (url.includes("video.twimg.com") || url.includes("twimg.com")) {
        return `/api/video-proxy?url=${encodeURIComponent(url)}`;
      }
      return url;
    };

    const videoUrl = getVideoUrl(post.video);

    return (
      <div className="mb-4 mt-2 rounded-lg overflow-hidden">
        <div className="video-container relative w-full aspect-video rounded-lg">
          <video
            className="w-full h-auto object-contain rounded-lg border border-gray-800 post-video"
            controls
            controlsList="nodownload"
            poster={
              post.videoThumbnail || "/placeholder.svg?height=240&width=400"
            }
            preload="metadata"
            playsInline
            crossOrigin="anonymous"
          >
            <source src={videoUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      </div>
    );
  } else if (post.mediaThumbnail) {
    const isExternalMedia = isExternalUrl(post.mediaThumbnail);

    if (isExternalMedia) {
      return (
        <div className="mb-4 mt-2 rounded-lg border border-gray-800 overflow-hidden max-h-[500px] flex justify-center">
          <img
            src={post.mediaThumbnail}
            alt="Tweet media"
            width={500}
            height={240}
            className="object-cover rounded-lg w-full h-auto"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.src = "/placeholder.svg";
            }}
          />
        </div>
      );
    } else {
      return (
        <div className="mb-4 mt-2 rounded-lg border border-gray-800 overflow-hidden max-h-[500px] flex justify-center">
          <Image
            src={post.mediaThumbnail}
            alt="Tweet media"
            width={500}
            height={240}
            className="object-cover rounded-lg"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.src = "/placeholder.svg";
            }}
            priority={false}
            loading="lazy"
            unoptimized={true}
          />
        </div>
      );
    }
  }

  return null;
};
