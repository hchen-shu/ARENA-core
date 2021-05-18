export class Utils {
    static round3(num) {
        return Math.round((num + Number.EPSILON) * 1000) / 1000;
    }
}
