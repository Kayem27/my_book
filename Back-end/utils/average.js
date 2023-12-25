exports.average = (array) => {
    let sum = 0;
    for (let nb of array) {
        sum += nb;
    };
    const average = sum / array.length;
    return Math.round(average);
};
