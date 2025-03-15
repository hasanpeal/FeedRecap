"use client";

import { useState, useEffect } from "react";
import { X, ChevronRight, ChevronLeft } from "lucide-react";

interface TutorialStep {
  target: string;
  title: string;
  content: string;
  position: "top" | "bottom" | "left" | "right";
}

interface TutorialOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  currentStep?: number;
  onStepChange?: (step: number) => void;
}

export const TutorialOverlay = ({
  isOpen,
  onClose,
  onComplete,
  currentStep: externalCurrentStep,
  onStepChange,
}: TutorialOverlayProps) => {
  const [currentStep, setCurrentStep] = useState(externalCurrentStep || 0);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState({});

  // Modify the tutorialSteps array to have fewer steps and simpler navigation
  const tutorialSteps: TutorialStep[] = [
    {
      target: "[data-tutorial='newsfeed']",
      title: "Newsfeed",
      content:
        "This is your personalized newsfeed where you can view posts from your favorite profiles and categories.",
      position: "bottom",
    },
    {
      target: "[data-tutorial='newsletter']",
      title: "Newsletter",
      content:
        "Access your personalized newsletter here. This tab shows your latest curated newsletter with top posts and content.",
      position: "bottom",
    },
    {
      target: "[data-tutorial='settings']",
      title: "Settings",
      content:
        "Customize your feed preferences in the settings tab. You can choose between category-based or profile-based feeds and update your preferences.",
      position: "bottom",
    },
    {
      target: "[data-tutorial='feed-type']",
      title: "Feed Type Selection",
      content:
        "Choose between Categories (content organized by topic) or Profiles (content from specific accounts you follow). Select your preference and click 'Update Feed Type'.",
      position: "right",
    },
    {
      target: "[data-tutorial='twitter-connect']",
      title: "Connect X Account",
      content:
        "Link your X/Twitter account to easily import profiles you follow. This lets you select from your followed accounts instead of adding them manually.",
      position: "right",
    },
    {
      target: "[data-tutorial='categories']",
      title: "Category Selection",
      content:
        "If you choose the category-based feed, select topics you're interested in here. Your feed will show content from these categories.",
      position: "right",
    },
    {
      target: "[data-tutorial='profiles-manage']",
      title: "Manage Profiles",
      content:
        "If you choose the profile-based feed, add or remove specific accounts to follow here. You can search for profiles or import them from your X/Twitter account.",
      position: "right",
    },
    {
      target: "[data-tutorial='time-settings']",
      title: "Time Preferences",
      content:
        "Set your preferred time to receive newsletters. Choose morning, afternoon, or night based on when you prefer to catch up on content.",
      position: "right",
    },
  ];

  // Update internal state when external state changes
  useEffect(() => {
    if (externalCurrentStep !== undefined) {
      setCurrentStep(externalCurrentStep);
    }
  }, [externalCurrentStep]);

  useEffect(() => {
    if (!isOpen) return;

    // Update the tooltip positioning logic to ensure it stays on screen
    const updateTooltipPosition = () => {
      const step = tutorialSteps[currentStep];
      const element = document.querySelector(step.target) as HTMLElement;

      if (!element) return;
      setTargetElement(element);

      const rect = element.getBoundingClientRect();
      const tooltipWidth = 320;
      const tooltipHeight = 180;
      const spacing = 15;
      const viewportPadding = 20;

      let style: any = {};

      switch (step.position) {
        case "top":
          style = {
            top: Math.max(viewportPadding, rect.top - tooltipHeight - spacing),
            left: rect.left + rect.width / 2 - tooltipWidth / 2,
          };
          break;
        case "bottom":
          style = {
            top: Math.min(
              window.innerHeight - tooltipHeight - viewportPadding,
              rect.bottom + spacing
            ),
            left: rect.left + rect.width / 2 - tooltipWidth / 2,
          };
          break;
        case "left":
          style = {
            top: rect.top + rect.height / 2 - tooltipHeight / 2,
            left: Math.max(viewportPadding, rect.left - tooltipWidth - spacing),
          };
          break;
        case "right":
          style = {
            top: rect.top + rect.height / 2 - tooltipHeight / 2,
            left: Math.min(
              window.innerWidth - tooltipWidth - viewportPadding,
              rect.right + spacing
            ),
          };
          break;
      }

      // Ensure tooltip stays within viewport
      if (style.left < viewportPadding) style.left = viewportPadding;
      if (style.left + tooltipWidth > window.innerWidth - viewportPadding)
        style.left = window.innerWidth - tooltipWidth - viewportPadding;
      if (style.top < viewportPadding) style.top = viewportPadding;
      if (style.top + tooltipHeight > window.innerHeight - viewportPadding)
        style.top = window.innerHeight - tooltipHeight - viewportPadding;

      setTooltipStyle(style);
    };

    updateTooltipPosition();
    window.addEventListener("resize", updateTooltipPosition);

    // Highlight the target element
    if (targetElement) {
      targetElement.classList.remove("tutorial-highlight");
    }

    const newTarget = document.querySelector(
      tutorialSteps[currentStep].target
    ) as HTMLElement;
    if (newTarget) {
      newTarget.classList.add("tutorial-highlight");
      setTargetElement(newTarget);

      // Scroll element into view if needed
      const rect = newTarget.getBoundingClientRect();
      const isInViewport =
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <=
          (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <=
          (window.innerWidth || document.documentElement.clientWidth);

      if (!isInViewport) {
        newTarget.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }

    return () => {
      window.removeEventListener("resize", updateTooltipPosition);
      if (targetElement) {
        targetElement.classList.remove("tutorial-highlight");
      }
    };
  }, [isOpen, currentStep, tutorialSteps, targetElement]);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      if (targetElement) {
        targetElement.classList.remove("tutorial-highlight");
      }
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      if (onStepChange) {
        onStepChange(nextStep);
      }
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      if (targetElement) {
        targetElement.classList.remove("tutorial-highlight");
      }
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      if (onStepChange) {
        onStepChange(prevStep);
      }
    }
  };

  const handleComplete = () => {
    if (targetElement) {
      targetElement.classList.remove("tutorial-highlight");
    }
    onComplete();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none tutorial-overlay">
      {/* Semi-transparent overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-50 pointer-events-auto" />

      {/* Tutorial tooltip */}
      <div
        className="absolute pointer-events-auto bg-[#111] border border-[#7FFFD4] rounded-lg shadow-lg p-4 w-[320px] z-[101]"
        style={tooltipStyle}
      >
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-[#7FFFD4] font-bold text-lg">
            {tutorialSteps[currentStep].title}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-800"
            aria-label="Skip tutorial"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-white mb-6 text-sm">
          {tutorialSteps[currentStep].content}
        </p>

        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-400">
            Step {currentStep + 1} of {tutorialSteps.length}
          </div>

          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrevious}
                className="flex items-center gap-1 text-[#7FFFD4] hover:underline px-3 py-1"
              >
                <ChevronLeft size={16} />
                Previous
              </button>
            )}

            <button
              onClick={handleNext}
              className="flex items-center gap-1 bg-[#7FFFD4] text-black px-4 py-1 rounded-md hover:bg-[#00CED1] transition-colors"
            >
              {currentStep < tutorialSteps.length - 1 ? (
                <>
                  Next
                  <ChevronRight size={16} />
                </>
              ) : (
                "Finish"
              )}
            </button>
          </div>
        </div>

        {/* Skip button at the bottom */}
        <div className="mt-3 text-center">
          <button
            onClick={onComplete}
            className="text-gray-400 hover:text-white text-sm hover:underline"
          >
            Skip tutorial
          </button>
        </div>
      </div>
    </div>
  );
};
