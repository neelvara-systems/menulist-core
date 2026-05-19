'use client';

import { PlanType } from '@data/common';
import { DialogDescription, DialogTitle } from '@radix-ui/react-dialog';
import { Button } from '@shadcncomponents/button';
import { Dialog, DialogContent, DialogHeader } from '@shadcncomponents/dialog';
import { Input } from '@shadcncomponents/input';
import { Label } from '@shadcncomponents/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shadcncomponents/select';
import { useToast } from '@shadcnhooks/use-toast';
import { useInView } from '@shadcnhooks/useInView';
import { resolveBusinessDayEndTime } from '@lib/analytics/businessDay';
import { IMAGE_VIEW_TYPES } from '@template/main-app/projects/editorView/AiImageGenerator/imageViewType';
import { motion } from 'framer-motion';
import { signIn, useSession } from 'next-auth/react';
import React, { useEffect, useMemo, useState } from 'react';
import { FcGoogle } from 'react-icons/fc';
// import SectionHeading from '@shadcncomponents/SectionHeading';

const SectionHeading = ({ text, highlightedText, as: Tag = 'h2', subheading }) => {
    const [ref, isInView] = useInView<any>({ threshold: 0.1, triggerOnce: true });
    const parts = text.split(new RegExp(`(${highlightedText})`, 'gi'));

    const MotionTag = motion[Tag];

    const variants = {
        hidden: { opacity: 0, y: -20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
    };

    return (
        <>
            <MotionTag
                ref={ref}
                className={`text-xl md:text-2xl lg:text-2xl font-extrabold text-center flex items-center justify-center flex-col gap-2`}
                initial="hidden"
                animate={isInView ? "visible" : "hidden"}
                variants={variants}
            >
                {parts.map((part, index) =>
                    part.toLowerCase() === highlightedText.toLowerCase() ? (
                        <span key={index} className="font-black text-3xl md:text-4xl lg:text-4xl ws-brand-gradient-text">
                            {part}
                        </span>
                    ) : (
                        part
                    )
                )}
            </MotionTag>
        </>
    );
};

interface OnboardingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (details: { businessName: string; businessIndustry: string; timeZone?: string; businessDayEndTime?: string }) => void;
    businessType: PlanType;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose, onSubmit, businessType }) => {
    const { toast } = useToast();
    const [businessName, setBusinessName] = useState('');
    const [businessIndustry, setBusinessIndustry] = useState('');
    const [timeZone, setTimeZone] = useState('');
    const [businessDayEndTime, setBusinessDayEndTime] = useState('');
    const [businessDayEndTimeEdited, setBusinessDayEndTimeEdited] = useState(false);
    const { data: session } = useSession();

    useEffect(() => {
        try {
            setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || '');
        } catch {
            setTimeZone('');
        }
    }, []);

    useEffect(() => {
        if (!businessDayEndTimeEdited) {
            setBusinessDayEndTime(resolveBusinessDayEndTime(businessIndustry));
        }
    }, [businessDayEndTimeEdited, businessIndustry]);

    const businessDayHint = useMemo(() => {
        return businessDayEndTime === '00:00'
            ? 'Analytics follow the calendar day for this business type.'
            : 'Analytics include after-midnight activity in the previous business day.';
    }, [businessDayEndTime]);

    const handleSubmit = () => {
        if (!businessName.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please enter business name.' });
            return;
        }
        if (!businessIndustry.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select business industry.' });
            return;
        }
        onSubmit({ businessName, businessIndustry, timeZone, businessDayEndTime });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <style>
                {`
                    .industry-dropdown {
                        justify-content: space-between !important;
                    }
                `}
            </style>
            <DialogContent className="p-0 border-none max-w-4xl">
                <div className="grid grid-cols-1 lg:grid-cols-2">
                    {/* Left Panel: The "Why" */}
                    <div className="relative hidden lg:flex flex-col items-center justify-center p-8 bg-muted text-center order-last lg:order-first">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="w-64 h-64 bg-card rounded-full flex items-center justify-center mb-6 shadow-lg"
                        >
                            <p className="text-muted-foreground text-sm">[Animation Here]</p>
                        </motion.div>
                        <SectionHeading
                            as="h2"
                            text="Your business deserves Look Brilliant Online Let's get started."
                            highlightedText="Look Brilliant Online"
                            subheading=""
                        />
                    </div>

                    {/* Right Panel: The "How" */}
                    <div className="p-8 flex flex-col gap-4 align-center justify-center">
                        <DialogHeader className="text-left">
                            <DialogTitle className="text-2xl font-bold tracking-tight">Tell us about your business</DialogTitle>
                        </DialogHeader>
                        <DialogDescription>
                            Just a few details to create your workspace. This helps us tailor your experience from the start.
                        </DialogDescription>
                        <div className="grid gap-6 py-6">
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                                className="grid w-full items-center gap-2"
                            >
                                <Label htmlFor="businessName">Business Name</Label>
                                <Input
                                    id="businessName"
                                    value={businessName}
                                    onChange={(e) => setBusinessName(e.target.value)}
                                    placeholder="e.g., The Good Food Cafe"
                                />
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5, delay: 0.4 }}
                                className="grid w-full items-center gap-2"
                            >
                                <Label htmlFor="businessIndustry">Business Industry</Label>
                                {businessType === 'B2C' ? (
                                    <Select onValueChange={setBusinessIndustry} value={businessIndustry}>
                                        <SelectTrigger id="businessIndustry" className="flex align-center w-full justify-between industry-dropdown">
                                            <SelectValue placeholder="Select an industry" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {IMAGE_VIEW_TYPES.map((type) => (
                                                <SelectItem key={type.businessType} value={type.businessType}>
                                                    {type.businessType}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <Select onValueChange={setBusinessIndustry} value={businessIndustry}>
                                        <SelectTrigger id="businessIndustry" className="w-full justify-between">
                                            <SelectValue placeholder="Select an industry" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="POS Software">POS Software</SelectItem>
                                            <SelectItem value="Marketing Agency">Marketing Agency</SelectItem>
                                            <SelectItem value="SaaS Company">SaaS Company</SelectItem>
                                            <SelectItem value="Other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5, delay: 0.5 }}
                                className="grid w-full items-center gap-2"
                            >
                                <Label htmlFor="businessDayEndTime">Business day ends at</Label>
                                <Input
                                    id="businessDayEndTime"
                                    type="time"
                                    value={businessDayEndTime}
                                    onChange={(e) => {
                                        setBusinessDayEndTimeEdited(true);
                                        setBusinessDayEndTime(e.target.value);
                                    }}
                                />
                                <p className="text-xs text-muted-foreground">
                                    {businessDayHint} You can change this later in Language & Region settings.
                                </p>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.6 }}
                            >
                                {Boolean(session?.user) ? <Button onClick={handleSubmit} className="w-full text-base" size="lg">
                                    <FcGoogle className="mr-2 h-5 w-5" /> Continue →
                                </Button> : <Button onClick={handleSubmit} className="w-full text-base" size="lg">
                                    <FcGoogle className="mr-2 h-5 w-5" /> Continue with Google →
                                </Button>}
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.6 }}
                            >
                                <div className='flex justify-center items-center mt-6'>
                                    <p className='text-muted-foreground text-sm'>Already have an account? <span className='text-primary cursor-pointer' onClick={() => signIn('google', { callbackUrl: window.location.href })}>Sign In with Google</span></p>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default OnboardingModal;
