function login(){
    let key = document.querySelector('#key').value

    axios({
        url: '/api/login',
        method: 'post',
        headers: {
            'Content-Type': 'application/json'
        },
        data: JSON.stringify({
            key: key
        })
    }).then(res => {
        if (res.data.msg === 'OK') {
            location.href = '/'
        }
    })

}