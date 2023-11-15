'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';

export const SignIn = () => {

    const signInRef = useRef(null);

    useEffect(() => {

        const currentUrl = window.location.href;
        const params = new URL(currentUrl).searchParams;
        const code = params.get('code');

        if (!code) return;

        const options = {
        method: 'POST',
        url: '/api/authentication/createToken',
        headers: {
            accept: 'application/json',
            'content-type': 'application/json',
        },
        data: { code },
        };
        
        axios
        .request(options)
        .then(function (response) {
            alert(response.data);
        })
        .catch(function (error) {
            console.error(error);
        });

    }, []);

    return (
        <div className="max-w-3xl space-y-4">
        <h1 className="text-3xl sm:text-3xl md:text-3xl">
            To login please type organisation id and submit
        </h1>
        <a
            ref={signInRef}
            style={{ display: 'block' }}
            href={`https://api.notion.com/v1/oauth/authorize?client_id=8df27c71-ed50-41c0-866b-8a625000c87c&response_type=code&owner=user`}>
            Sign In with Notion
        </a>
        </div>
    );
};
