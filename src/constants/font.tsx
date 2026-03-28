export const FONT_LIST = [
    { label: <span style={{ fontFamily: 'Poppins' }}>Poppins</span>, value: 'Poppins' },
    { label: <span style={{ fontFamily: 'Abuget' }}>Abuget</span>, value: 'Abuget' },
    { label: <span style={{ fontFamily: 'AlexisMarie' }}>AlexisMarie</span>, value: 'AlexisMarie' },
    { label: <span style={{ fontFamily: 'Allura' }}>Allura</span>, value: 'Allura' },
    { label: <span style={{ fontFamily: 'Antonio' }}>Antonio</span>, value: 'Antonio' },
    { label: <span style={{ fontFamily: 'ArgoFlats' }}>ArgoFlats</span>, value: 'ArgoFlats' },
    { label: <span style={{ fontFamily: 'Bakery' }}>Bakery</span>, value: 'Bakery' },
    { label: <span style={{ fontFamily: 'Blackjack' }}>Blackjack</span>, value: 'Blackjack' },
    { label: <span style={{ fontFamily: 'Claredon' }}>Claredon</span>, value: 'Claredon' },
    { label: <span style={{ fontFamily: 'Domaine' }}>Domaine</span>, value: 'Domaine' },
    { label: <span style={{ fontFamily: 'Enchanting' }}>Enchanting</span>, value: 'Enchanting' },
    { label: <span style={{ fontFamily: 'Fontspring' }}>Fontspring</span>, value: 'Fontspring' },
    { label: <span style={{ fontFamily: 'Gothic' }}>Gothic</span>, value: 'Gothic' },
    { label: <span style={{ fontFamily: 'Lhandw' }}>Lhandw</span>, value: 'Lhandw' },
    { label: <span style={{ fontFamily: 'Manta' }}>Manta</span>, value: 'Manta' },
    { label: <span style={{ fontFamily: 'Mvboli' }}>Mvboli</span>, value: 'Mvboli' },
    { label: <span style={{ fontFamily: 'Philosopher' }}>Philosopher</span>, value: 'Philosopher' },
    { label: <span style={{ fontFamily: 'Thunder' }}>Thunder</span>, value: 'Thunder' },
    { label: <span style={{ fontFamily: 'Wayfarer' }}>Wayfarer</span>, value: 'Wayfarer' }
]

const FontSizesList = [];
for (let i = 1; i <= 100; i++) {
    FontSizesList.push({ label: `${i}px`, value: `${i}px` })
}
export const FONT_SIZES = FontSizesList;
