import Image from "next/image";
import { Post } from "./types";
import { isIOS } from "./utils";

interface MediaRendererProps {
  post: Post;
}

export const MediaRenderer = ({ post }: MediaRendererProps) => {
  if (isIOS()) {
    if (post.video) {
      return (
        <div className="mb-4 mt-2 rounded-lg overflow-hidden">
          <Image
            src={post.videoThumbnail || "/placeholder.svg?height=240&width=400"}
            alt="Video Poster"
            width={500}
            height={240}
            className="object-cover rounded-lg border border-gray-800"
            onError={(e) => {
              console.error(
                "iOS video thumbnail loading error:",
                post.videoThumbnail
              );
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

  if (post.video) {
    return (
      <div className="mb-4 mt-2 rounded-lg overflow-hidden">
        <div className="video-container relative w-full aspect-video rounded-lg">
          <video
            src={post.video}
            className="w-full h-auto object-contain rounded-lg border border-gray-800 post-video"
            controls
            controlsList="nodownload"
            poster={
              post.videoThumbnail || "/placeholder.svg?height=240&width=400"
            }
          >
            Your browser does not support the video tag.
          </video>
        </div>
      </div>
    );
  } else if (post.mediaThumbnail) {
    return (
      <div className="mb-4 mt-2 rounded-lg border border-gray-800 overflow-hidden max-h-[500px] flex justify-center">
        <Image
          src={post.mediaThumbnail}
          alt="Tweet media"
          width={500}
          height={240}
          className="object-cover rounded-lg"
          onError={(e) => {
            console.error("Image loading error:", post.mediaThumbnail);
            e.currentTarget.src = "/placeholder.svg";
          }}
          priority={false}
          loading="lazy"
          unoptimized={true}
        />
      </div>
    );
  }

  return null;
};
