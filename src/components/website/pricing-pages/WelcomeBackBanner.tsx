
import { Card } from "@shadcncomponents/card";
import React from 'react';
import { LuPartyPopper } from 'react-icons/lu';

interface WelcomeBackBannerProps {
    tenantName: string;
}

const WelcomeBackBanner: React.FC<WelcomeBackBannerProps> = ({ tenantName }) => {
    return (
        <Card className="w-max mx-auto mb-12 p-4 border-green-200 dark:border-green-800/50 bg-green-50 dark:bg-green-900/20">
            <div className="flex items-center gap-4 justify-center">
                <div className="text-green-500">
                    <LuPartyPopper className="h-12 w-12" />
                </div>
                <div className="">
                    <h3 className="text-lg font-bold text-green-800 dark:text-green-300">
                        Welcome back, {tenantName}!
                    </h3>
                    <p className="text-muted-foreground text-sm">
                        Ready to activate your account and unlock the full power of MenuListAI? Just select a plan below to get started.
                    </p>
                </div>
            </div>
        </Card>
    );
};

export default WelcomeBackBanner;