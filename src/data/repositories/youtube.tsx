const retrieveYoutubeStreamKey = async (accessToken: string) => {
  const params =
    'part=id,snippet,contentDetails,status&broadcastType=persistent&mine=true';

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/liveStreams?${params}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    },
  );

  const data = await res.json();

  return data;
};

export {retrieveYoutubeStreamKey};
