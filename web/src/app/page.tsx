import {
  PixelButton,
  PixelCard,
  PixelCardHeader,
  PixelCardTitle,
  PixelCardContent,
  PixelProgress,
  PixelInput,
  RalphSprite,
} from "@/components/pixel";

export default function Home() {
  return (
    <main className="min-h-screen bg-simpson-dark p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="font-pixel text-2xl text-simpson-yellow">
            RALPH WEB
          </h1>
          <p className="font-pixel-body text-xl text-simpson-white">
            8-bit Pixel Art Theme Demo
          </p>
        </div>

        {/* Ralph Sprites */}
        <PixelCard>
          <PixelCardHeader>
            <PixelCardTitle>Ralph Sprites</PixelCardTitle>
          </PixelCardHeader>
          <PixelCardContent>
            <div className="flex flex-wrap gap-6 items-end">
              <div className="text-center">
                <RalphSprite state="idle" size="lg" />
                <p className="mt-2 font-pixel text-[8px]">IDLE</p>
              </div>
              <div className="text-center">
                <RalphSprite state="thinking" size="lg" />
                <p className="mt-2 font-pixel text-[8px]">THINKING</p>
              </div>
              <div className="text-center">
                <RalphSprite state="working" size="lg" />
                <p className="mt-2 font-pixel text-[8px]">WORKING</p>
              </div>
              <div className="text-center">
                <RalphSprite state="success" size="lg" />
                <p className="mt-2 font-pixel text-[8px]">SUCCESS</p>
              </div>
              <div className="text-center">
                <RalphSprite state="error" size="lg" />
                <p className="mt-2 font-pixel text-[8px]">ERROR</p>
              </div>
              <div className="text-center">
                <RalphSprite state="waiting" size="lg" />
                <p className="mt-2 font-pixel text-[8px]">WAITING</p>
              </div>
            </div>
          </PixelCardContent>
        </PixelCard>

        {/* Buttons */}
        <PixelCard>
          <PixelCardHeader>
            <PixelCardTitle>Pixel Buttons</PixelCardTitle>
          </PixelCardHeader>
          <PixelCardContent>
            <div className="flex flex-wrap gap-4">
              <PixelButton variant="primary">PRIMARY</PixelButton>
              <PixelButton variant="secondary">SECONDARY</PixelButton>
              <PixelButton variant="success">SUCCESS</PixelButton>
              <PixelButton variant="danger">DANGER</PixelButton>
            </div>
            <div className="mt-4 flex flex-wrap gap-4">
              <PixelButton size="sm">SMALL</PixelButton>
              <PixelButton size="md">MEDIUM</PixelButton>
              <PixelButton size="lg">LARGE</PixelButton>
            </div>
          </PixelCardContent>
        </PixelCard>

        {/* Progress Bars */}
        <PixelCard>
          <PixelCardHeader>
            <PixelCardTitle>Progress Bars</PixelCardTitle>
          </PixelCardHeader>
          <PixelCardContent>
            <div className="space-y-4">
              <div>
                <p className="font-pixel text-[8px] mb-2">DEFAULT (75%)</p>
                <PixelProgress value={75} showLabel />
              </div>
              <div>
                <p className="font-pixel text-[8px] mb-2">SUCCESS (100%)</p>
                <PixelProgress value={100} variant="success" showLabel />
              </div>
              <div>
                <p className="font-pixel text-[8px] mb-2">WARNING (50%)</p>
                <PixelProgress value={50} variant="warning" showLabel />
              </div>
              <div>
                <p className="font-pixel text-[8px] mb-2">DANGER (25%)</p>
                <PixelProgress value={25} variant="danger" showLabel />
              </div>
            </div>
          </PixelCardContent>
        </PixelCard>

        {/* Input Fields */}
        <PixelCard>
          <PixelCardHeader>
            <PixelCardTitle>Input Fields</PixelCardTitle>
          </PixelCardHeader>
          <PixelCardContent>
            <div className="space-y-4">
              <PixelInput
                label="WORKSTREAM NAME"
                placeholder="Enter workstream name..."
              />
              <PixelInput
                label="WITH ERROR"
                placeholder="Enter something..."
                error="This field has an error!"
              />
            </div>
          </PixelCardContent>
        </PixelCard>

        {/* Card Variants */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <PixelCard variant="default">
            <PixelCardHeader>
              <PixelCardTitle>Default Card</PixelCardTitle>
            </PixelCardHeader>
            <PixelCardContent>
              Standard card with brown border
            </PixelCardContent>
          </PixelCard>

          <PixelCard variant="elevated">
            <PixelCardHeader>
              <PixelCardTitle>Elevated Card</PixelCardTitle>
            </PixelCardHeader>
            <PixelCardContent>
              Yellow border and shadow
            </PixelCardContent>
          </PixelCard>

          <PixelCard variant="outlined">
            <PixelCardHeader>
              <PixelCardTitle>Outlined Card</PixelCardTitle>
            </PixelCardHeader>
            <PixelCardContent>
              Transparent background
            </PixelCardContent>
          </PixelCard>
        </div>
      </div>
    </main>
  );
}
