// This function is used to merge two objects deeply.
// It starts with all the properties in the first object (source).
// Then, it looks at each property in the second object (object).
// If a property in the second object is different from the one in the first object, it decides what to do:
// If the property is just a single value (like a number or a string), it puts that value in the merged object.
// If the property is an array, it checks if there are already some items in the merged array. If there are, it adds the new items to the existing ones.
// If the property is an object, it opens that object and merges the properties inside it with the properties in the first object, just like we’re doing with the two big boxes.
// In the end, you have one big object that has all the properties from both objects, combined in a way that makes sense!
// So, deepMerge is like a helper that makes sure all your properties are together nicely, without losing any of them.
const deepMerge = (source, object = {}, considerArray = false) => {
    const mergedObject = { ...source };
    const keys = Object.keys(object);
    keys.forEach((k) => {
        // considers null in the values.
        const val = object[k];
        if (val !== undefined) {
            const valType = typeof val;
            if (
                valType !== 'object' ||
                val === null ||
                Array.isArray(val) ||
                !source[k] ||
                typeof source[k] !== 'object'
            ) {
                mergedObject[k] =
                    considerArray && Array.isArray(mergedObject[k]) && Array.isArray(val)
                        ? [...mergedObject[k], ...val]
                        : val;
                return;
            }

            // After the above condition we now have both of them in type objects.
            mergedObject[k] = deepMerge(source[k], val);
        }
    });

    return mergedObject;
};

export default deepMerge;

// This function iterates through each key in the updated object.
// If the value of a key in the updated object is different from the value of the same key in the original object,
// it adds the key-value pair to the accumulator object.
// The function returns the accumulator object, which contains all the key-value pairs that are different between the updated and original objects.
export const getObjectDifferance = (updated: object, original: object) => {
    return Object.keys(updated).reduce((acc, key) => {
        if (updated[key] !== original[key]) {
            acc[key] = updated[key];
        }
        return acc;
    }, {});
};
