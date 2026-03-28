import { motion } from 'framer-motion'
import Image from 'next/image'

const DummyImage = "https://firebasestorage.googleapis.com/v0/b/ecomsai.appspot.com/o/craftBuilder%2FScreenshot%202024-06-01%20at%2010.45.15%E2%80%AFPM.png?alt=media&token=47795693-f302-4251-8035-7ac16c55ec3d"
function HeroImage({ imageUrl, imageAlt }: { imageUrl: string, imageAlt?: string }) {
    return (
        <motion.div
            className="relative mb-16"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
        >
            <div className="relative rounded-xl p-1 bg-gradient-to-br from-blue-500/40 to-transparent shadow-[0_0_40px_-10px_rgba(59,130,246,0.4)]">
                <div className="bg-gray-900 rounded-lg p-1">
                    <Image
                        src={imageUrl || DummyImage}
                        alt={imageAlt || "MenuListAi"}
                        width={900}
                        height={700}
                        className="rounded-md w-full h-auto"
                    />
                </div>
            </div>
            <p className='text-center text-xs text-muted-foreground mt-2'>{imageAlt}</p>
        </motion.div>

    )
}

export default HeroImage