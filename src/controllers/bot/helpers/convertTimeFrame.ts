const convertTimeframe = (tf: number) => {
  if (!tf) return 60;
  return tf < 60 ? tf * 60 : tf; // convert minutes to seconds
};

export default convertTimeframe;